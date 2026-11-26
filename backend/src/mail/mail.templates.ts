const BRAND = 'lineup24';
const INK = '#141820';
const WHITE = '#ffffff';
const SUPPORT_EMAIL = 'support@lineup24.ru';

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function layout(opts: {
  preheader: string;
  kicker: string;
  title: string;
  bodyHtml: string;
  footerNote?: string;
}) {
  const preheader = escapeHtml(opts.preheader);
  const kicker = escapeHtml(opts.kicker);
  const title = escapeHtml(opts.title);
  const year = new Date().getFullYear();
  const footer = opts.footerNote ?? `© ${year} ${BRAND}. 18+.`;

  return `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="color-scheme" content="dark" />
  <meta name="supported-color-schemes" content="dark" />
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background:${INK};font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:${WHITE};-webkit-font-smoothing:antialiased;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;">${preheader}</div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:${INK};">
    <tr>
      <td align="center" style="padding:40px 16px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:600px;">
          <tr>
            <td align="left" style="padding:0 8px 22px;">
              <span style="display:inline-block;font-size:15px;font-weight:700;letter-spacing:0.04em;color:${WHITE};">${BRAND}</span>
            </td>
          </tr>
          <tr>
            <td style="padding:0 4px;">
              <!-- accent strip -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td style="height:3px;line-height:3px;font-size:0;background:linear-gradient(90deg,#ffffff 0%,rgba(255,255,255,0.35) 45%,rgba(255,255,255,0.08) 100%);background-color:#ffffff;">&nbsp;</td>
                </tr>
              </table>

              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td style="padding:32px 12px 8px;">
                    <p style="margin:0 0 14px;font-size:11px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;color:rgba(255,255,255,0.42);">
                      ${kicker}
                    </p>
                    <h1 style="margin:0;font-size:28px;line-height:1.2;font-weight:700;letter-spacing:-0.02em;color:${WHITE};">
                      ${title}
                    </h1>
                  </td>
                </tr>
                <tr>
                  <td style="padding:18px 12px 12px;font-size:15px;line-height:1.65;color:rgba(255,255,255,0.72);">
                    ${opts.bodyHtml}
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:28px 12px 0;text-align:center;font-size:12px;line-height:1.55;color:rgba(255,255,255,0.38);">
              ${escapeHtml(footer)}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function codeBlock(code: string) {
  // One continuous text node so the full code copies as a single line.
  const safe = escapeHtml(code);
  return `<table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" style="margin:28px auto;">
  <tr>
    <td align="center" style="padding:16px 22px;border-radius:16px;background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.12);">
      <span style="display:inline-block;font-size:28px;font-weight:700;letter-spacing:0.35em;color:${WHITE};font-family:'Segoe UI',Consolas,monospace;user-select:all;-webkit-user-select:all;">${safe}</span>
    </td>
  </tr>
</table>`;
}

function ctaButton(label: string, href: string) {
  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:28px 0 0;">
  <tr>
    <td align="center" style="border-radius:999px;background:${WHITE};">
      <a href="${escapeHtml(href)}" style="display:block;width:100%;box-sizing:border-box;padding:16px 28px;border-radius:999px;background:${WHITE};color:${INK};text-decoration:none;font-weight:700;font-size:14px;letter-spacing:0.01em;text-align:center;">
        ${escapeHtml(label)}
      </a>
    </td>
  </tr>
</table>`;
}

function noticeBox(html: string, tone: 'soft' | 'warn' = 'soft') {
  const bg =
    tone === 'warn' ? 'rgba(220, 48, 48, 0.16)' : 'rgba(255,255,255,0.06)';
  const border =
    tone === 'warn' ? 'rgba(255, 90, 80, 0.55)' : 'rgba(255,255,255,0.1)';
  const color =
    tone === 'warn' ? 'rgba(255, 210, 205, 0.88)' : 'rgba(255,255,255,0.7)';
  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:24px 0 0;">
  <tr>
    <td style="padding:16px 18px;border-radius:16px;background:${bg};border:1px solid ${border};font-size:13px;line-height:1.55;color:${color};">
      ${html}
    </td>
  </tr>
</table>`;
}

function supportLink() {
  return `<a href="mailto:${SUPPORT_EMAIL}" style="color:${WHITE};text-decoration:underline;">${SUPPORT_EMAIL}</a>`;
}

export function verificationEmailHtml(code: string) {
  return layout({
    preheader: `Код подтверждения ${BRAND}: ${code}`,
    kicker: 'Регистрация',
    title: 'Подтвердите email',
    bodyHtml: `
      <p style="margin:0;">Введите этот код на сайте, чтобы завершить создание аккаунта.</p>
      ${codeBlock(code)}
      <p style="margin:0;text-align:center;font-size:13px;color:rgba(255,255,255,0.45);">Код действует <strong style="color:rgba(255,255,255,0.85);">15 минут</strong></p>
      ${noticeBox(
        `<strong style="color:${WHITE};">Не регистрировались?</strong><br />Просто проигнорируйте письмо — аккаунт без подтверждения не активируется. Вопросы: ${supportLink()}.`,
      )}
    `,
  });
}

export function verificationEmailText(code: string) {
  return [
    `${BRAND}: подтверждение email`,
    ``,
    `Код: ${code}`,
    `Действует 15 минут.`,
    ``,
    `Если вы не регистрировались — просто проигнорируйте письмо.`,
    `Поддержка: ${SUPPORT_EMAIL}`,
  ].join('\n');
}

export function emailChangeCurrentHtml(code: string, newEmail: string) {
  return layout({
    preheader: `Код смены email ${BRAND}: ${code}`,
    kicker: 'Безопасность',
    title: 'Подтвердите смену email',
    bodyHtml: `
      <p style="margin:0;">Запрошена смена почты на <strong style="color:${WHITE};">${escapeHtml(newEmail)}</strong>. Подтвердите, что это вы — введите код с текущего адреса:</p>
      ${codeBlock(code)}
      <p style="margin:0;text-align:center;font-size:13px;color:rgba(255,255,255,0.45);">Код действует <strong style="color:rgba(255,255,255,0.85);">15 минут</strong></p>
      ${noticeBox(
        `<strong style="color:#ffb4ae;">Если это были не вы</strong><br />Не вводите код. Смените пароль и завершите чужие сессии в настройках. Поддержка: ${supportLink()}.`,
        'warn',
      )}
    `,
  });
}

export function emailChangeCurrentText(code: string, newEmail: string) {
  return [
    `${BRAND}: смена email`,
    ``,
    `Запрошена смена почты на ${newEmail}.`,
    `Код: ${code}`,
    `Действует 15 минут.`,
    ``,
    `Если это были не вы — не используйте код, смените пароль и завершите сессии.`,
    `Поддержка: ${SUPPORT_EMAIL}`,
  ].join('\n');
}

export function emailChangeNewHtml(code: string) {
  return layout({
    preheader: `Код для новой почты ${BRAND}: ${code}`,
    kicker: 'Безопасность',
    title: 'Подтвердите новый email',
    bodyHtml: `
      <p style="margin:0;">Введите этот код в кабинете, чтобы завершить смену почты аккаунта.</p>
      ${codeBlock(code)}
      <p style="margin:0;text-align:center;font-size:13px;color:rgba(255,255,255,0.45);">Код действует <strong style="color:rgba(255,255,255,0.85);">15 минут</strong></p>
      ${noticeBox(
        `<strong style="color:${WHITE};">Не запрашивали смену?</strong><br />Проигнорируйте письмо. Вопросы: ${supportLink()}.`,
      )}
    `,
  });
}

export function emailChangeNewText(code: string) {
  return [
    `${BRAND}: подтверждение нового email`,
    ``,
    `Код: ${code}`,
    `Действует 15 минут.`,
    ``,
    `Если вы не меняли почту — просто проигнорируйте письмо.`,
    `Поддержка: ${SUPPORT_EMAIL}`,
  ].join('\n');
}

export function passwordResetEmailHtml(code: string) {
  return layout({
    preheader: `Код сброса пароля ${BRAND}: ${code}`,
    kicker: 'Безопасность',
    title: 'Сброс пароля',
    bodyHtml: `
      <p style="margin:0;">Мы получили запрос на смену пароля. Чтобы продолжить, введите код на сайте:</p>
      ${codeBlock(code)}
      <p style="margin:0;text-align:center;font-size:13px;color:rgba(255,255,255,0.45);">Код действует <strong style="color:rgba(255,255,255,0.85);">15 минут</strong></p>
      ${noticeBox(
        `<strong style="color:#ffb4ae;">Если это были не вы</strong><br />Ничего не делайте с этим кодом. Зайдите в кабинет, смените пароль и завершите все активные сессии. Если доступ потерян — напишите в поддержку: ${supportLink()}.`,
        'warn',
      )}
    `,
  });
}

export function passwordResetEmailText(code: string) {
  return [
    `${BRAND}: сброс пароля`,
    ``,
    `Код: ${code}`,
    `Действует 15 минут.`,
    ``,
    `Если это были не вы — не используйте код. Зайдите в кабинет, смените пароль и завершите активные сессии.`,
    `Поддержка: ${SUPPORT_EMAIL}`,
  ].join('\n');
}

export function signalTeaserEmailHtml(opts: {
  title: string;
  ctaUrl: string;
}) {
  const title = escapeHtml(opts.title);
  return layout({
    preheader: `Новый сигнал: ${opts.title}`,
    kicker: 'Линия',
    title: 'Опубликован новый сигнал',
    bodyHtml: `
      <p style="margin:0 0 18px;">В кабинете доступен новый прогноз. Детали — только после входа.</p>
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
        <tr>
          <td style="padding:22px 22px;border-radius:20px;background:rgba(255,255,255,0.07);border:1px solid rgba(255,255,255,0.1);">
            <p style="margin:0 0 8px;font-size:11px;font-weight:700;letter-spacing:0.16em;text-transform:uppercase;color:rgba(255,255,255,0.4);">Сигнал</p>
            <p style="margin:0;font-size:20px;line-height:1.35;font-weight:700;color:${WHITE};letter-spacing:-0.01em;">${title}</p>
          </td>
        </tr>
      </table>
      ${ctaButton('Открыть в кабинете', opts.ctaUrl)}
    `,
  });
}

export function signalTeaserEmailText(opts: {
  title: string;
  ctaUrl: string;
}) {
  return [
    `${BRAND}: опубликован новый сигнал`,
    ``,
    opts.title,
    ``,
    `Открыть в кабинете: ${opts.ctaUrl}`,
  ].join('\n');
}

export function broadcastEmailHtml(opts: { title: string; body: string }) {
  return layout({
    preheader: opts.title,
    kicker: 'Сообщение',
    title: opts.title,
    bodyHtml: `<p style="margin:0;white-space:pre-wrap;">${escapeHtml(opts.body)}</p>`,
  });
}

export function broadcastEmailText(opts: { title: string; body: string }) {
  return `${opts.title}\n\n${opts.body}`;
}
