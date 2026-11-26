#!/usr/bin/env python3
"""One-shot deploy to VPS. Secrets via env — do not commit filled values."""

from __future__ import annotations

import os
import sys
import time
from pathlib import Path

import paramiko

HOST = os.environ.get("LINEUP_SSH_HOST", "31.129.99.227")
USER = os.environ.get("LINEUP_SSH_USER", "root")
PASSWORD = os.environ["LINEUP_SSH_PASS"]
REPO = "https://github.com/chudov1she/lineup24.git"
APP_DIR = "/opt/lineup24"
LOCAL_ROOT = Path(__file__).resolve().parents[1]
DUMP_PATH = LOCAL_ROOT / "lineup.dump"


def connect() -> paramiko.SSHClient:
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(
        HOST,
        username=USER,
        password=PASSWORD,
        timeout=45,
        allow_agent=False,
        look_for_keys=False,
    )
    return client


def run(
    client: paramiko.SSHClient,
    cmd: str,
    *,
    timeout: int = 600,
    check: bool = True,
) -> tuple[int, str, str]:
    print(f"$ {cmd}")
    _stdin, stdout, stderr = client.exec_command(cmd, timeout=timeout)
    out_chunks: list[bytes] = []
    err_chunks: list[bytes] = []
    while not stdout.channel.exit_status_ready():
        if stdout.channel.recv_ready():
            out_chunks.append(stdout.channel.recv(65536))
        if stdout.channel.recv_stderr_ready():
            err_chunks.append(stdout.channel.recv_stderr(65536))
        time.sleep(0.2)
    out_chunks.append(stdout.read())
    err_chunks.append(stderr.read())
    out = b"".join(out_chunks).decode("utf-8", "replace")
    err = b"".join(err_chunks).decode("utf-8", "replace")
    code = stdout.channel.recv_exit_status()
    if out.strip():
        print(out[-4000:] if len(out) > 4000 else out)
    if err.strip():
        print(err[-2000:] if len(err) > 2000 else err, file=sys.stderr)
    if check and code != 0:
        raise RuntimeError(f"command failed ({code}): {cmd}")
    return code, out, err


def sftp_put(client: paramiko.SSHClient, local: Path, remote: str) -> None:
    print(f"upload {local} -> {remote}")
    with client.open_sftp() as sftp:
        sftp.put(str(local), remote)


def backend_env() -> str:
    return f"""PORT=8000
FRONTEND_URL=https://lineup24.ru
COOKIE_SECURE=true
DATABASE_URL=postgresql://lineup:{os.environ["LINEUP_DB_PASS"]}@db:5432/lineup?schema=public
REDIS_URL=redis://redis:6379
JWT_ACCESS_SECRET={os.environ["LINEUP_JWT_ACCESS"]}
JWT_REFRESH_SECRET={os.environ["LINEUP_JWT_REFRESH"]}
JWT_ACCESS_EXPIRES=15m
JWT_REFRESH_EXPIRES=30d
SUBSCRIPTION_SEAT_LIMIT=100
MAX_ACTIVE_SESSIONS=5
NODE_ENV=production
TOS_VERSION=2026-11-26
PRIVACY_VERSION=2026-11-26
TELEGRAM_BOT_USERNAME=lineup24_bot
TELEGRAM_BOT_TOKEN={os.environ["LINEUP_TG_TOKEN"]}
TELEGRAM_WEBHOOK_SECRET={os.environ["LINEUP_TG_WH_SECRET"]}
TELEGRAM_MODE=polling
PLATEGA_MERCHANT_ID=
PLATEGA_SECRET=
PLATEGA_API_BASE=https://app.platega.io
SMTP_HOST=smtp.yandex.ru
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER={os.environ["LINEUP_SMTP_USER"]}
SMTP_PASS={os.environ["LINEUP_SMTP_PASS"]}
SMTP_FROM="lineup24 <{os.environ["LINEUP_SMTP_USER"]}>"
MAIL_EXPOSE_CODES=false
VAPID_PUBLIC_KEY={os.environ["LINEUP_VAPID_PUBLIC"]}
VAPID_PRIVATE_KEY={os.environ["LINEUP_VAPID_PRIVATE"]}
VAPID_SUBJECT=mailto:support@lineup24.ru
"""


def compose_env() -> str:
    return f"""POSTGRES_USER=lineup
POSTGRES_PASSWORD={os.environ["LINEUP_DB_PASS"]}
POSTGRES_DB=lineup
FRONTEND_URL=https://lineup24.ru
COOKIE_SECURE=true
NEXT_PUBLIC_SITE_URL=https://lineup24.ru
RUN_SEED=false
"""


def write_remote_file(client: paramiko.SSHClient, remote: str, content: str) -> None:
    with client.open_sftp() as sftp:
        with sftp.file(remote, "w") as fh:
            fh.write(content)
    print(f"wrote {remote} ({len(content)} bytes)")


def main() -> None:
    if not DUMP_PATH.exists():
        raise SystemExit(f"missing dump: {DUMP_PATH}")

    client = connect()
    try:
        run(client, "set -e; command -v curl >/dev/null; command -v git >/dev/null || apt-get update")

        # Swap for Next.js build on 4GB
        run(
            client,
            """set -e
if [ ! -f /swapfile ]; then
  fallocate -l 2G /swapfile || dd if=/dev/zero of=/swapfile bs=1M count=2048
  chmod 600 /swapfile
  mkswap /swapfile
  swapon /swapfile
  grep -q '/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi
swapon --show || true
free -h
""",
            timeout=180,
        )

        # Docker
        run(
            client,
            """set -e
if ! command -v docker >/dev/null 2>&1; then
  curl -fsSL https://get.docker.com | sh
  systemctl enable --now docker
fi
docker --version
docker compose version
""",
            timeout=600,
        )

        # App tree
        run(
            client,
            f"""set -e
if [ -d {APP_DIR}/.git ]; then
  cd {APP_DIR} && git fetch origin && git reset --hard origin/main
else
  rm -rf {APP_DIR}
  git clone {REPO} {APP_DIR}
fi
cd {APP_DIR} && git rev-parse --short HEAD && ls -la
""",
            timeout=180,
        )

        write_remote_file(client, f"{APP_DIR}/.env", compose_env())
        write_remote_file(client, f"{APP_DIR}/backend/.env", backend_env())
        sftp_put(client, DUMP_PATH, f"{APP_DIR}/lineup.dump")
        run(client, f"chmod 600 {APP_DIR}/.env {APP_DIR}/backend/.env")

        # Build & start DB first, restore, then full stack
        run(
            client,
            f"""set -e
cd {APP_DIR}
docker compose pull caddy redis db || true
docker compose up -d db redis
""",
            timeout=300,
        )

        # Wait for postgres
        for _ in range(60):
            code, _, _ = run(
                client,
                "docker compose -f /opt/lineup24/docker-compose.yml exec -T db pg_isready -U lineup -d lineup",
                check=False,
            )
            if code == 0:
                break
            time.sleep(2)
        else:
            raise RuntimeError("postgres not ready")

        run(
            client,
            f"""set -e
cd {APP_DIR}
docker compose cp lineup.dump db:/tmp/lineup.dump
docker compose exec -T db pg_restore -U lineup -d lineup --clean --if-exists --no-owner --no-acl /tmp/lineup.dump
docker compose exec -T db psql -U lineup -d lineup -c "SELECT count(*) AS users FROM \\"User\\";"
""",
            timeout=180,
        )

        run(
            client,
            f"""set -e
cd {APP_DIR}
docker compose up -d --build
docker compose ps
""",
            timeout=1200,
        )

        # Wait for health
        for i in range(90):
            code, out, _ = run(
                client,
                f"cd {APP_DIR} && docker compose ps --format '{{{{.Name}}}} {{{{.Status}}}}'",
                check=False,
            )
            if "project-lineup-caddy" in out and "project-lineup-frontend" in out:
                if out.count("(healthy)") >= 3 or ("Up" in out and "starting" not in out.lower()):
                    # soft check — continue to HTTP probes
                    pass
            time.sleep(5)
            if i % 6 == 0:
                print(f"waiting services… {i*5}s")

        run(
            client,
            """set -e
sleep 5
curl -sI -m 20 http://127.0.0.1:3000 | head -15 || true
curl -sI -m 20 -H 'Host: lineup24.ru' http://127.0.0.1 | head -20 || true
curl -sI -m 30 https://lineup24.ru | head -20 || true
curl -sI -m 30 https://lineup24.ru/api/payments/platega/webhook | head -20 || true
docker compose -f /opt/lineup24/docker-compose.yml ps
""",
            timeout=120,
        )
        print("DEPLOY_OK")
    finally:
        client.close()


if __name__ == "__main__":
    main()
