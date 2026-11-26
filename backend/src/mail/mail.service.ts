import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import nodemailer, { type Transporter } from 'nodemailer';
import {
  broadcastEmailHtml,
  broadcastEmailText,
  emailChangeCurrentHtml,
  emailChangeCurrentText,
  emailChangeNewHtml,
  emailChangeNewText,
  passwordResetEmailHtml,
  passwordResetEmailText,
  signalTeaserEmailHtml,
  signalTeaserEmailText,
  verificationEmailHtml,
  verificationEmailText,
} from './mail.templates.js';

export type SendVerificationResult = {
  delivered: boolean;
  /** Present only when SMTP is not configured / failed and expose is allowed. */
  code?: string;
};

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: Transporter | null = null;

  constructor(private readonly config: ConfigService) {}

  async sendEmailVerification(
    email: string,
    code: string,
  ): Promise<SendVerificationResult> {
    return this.sendCodedEmail({
      email,
      code,
      subject: 'Подтверждение регистрации: код для email — lineup24',
      html: verificationEmailHtml(code),
      text: verificationEmailText(code),
      kind: 'verification',
    });
  }

  async sendEmailChangeCurrent(
    email: string,
    code: string,
    newEmail: string,
  ): Promise<SendVerificationResult> {
    return this.sendCodedEmail({
      email,
      code,
      subject: 'Смена email: код с текущего адреса — lineup24',
      html: emailChangeCurrentHtml(code, newEmail),
      text: emailChangeCurrentText(code, newEmail),
      kind: 'email-change-current',
    });
  }

  async sendEmailChangeNew(
    email: string,
    code: string,
  ): Promise<SendVerificationResult> {
    return this.sendCodedEmail({
      email,
      code,
      subject: 'Смена email: код для новой почты — lineup24',
      html: emailChangeNewHtml(code),
      text: emailChangeNewText(code),
      kind: 'email-change-new',
    });
  }

  async sendPasswordReset(
    email: string,
    code: string,
  ): Promise<SendVerificationResult> {
    return this.sendCodedEmail({
      email,
      code,
      subject: 'Сброс пароля: код для смены пароля — lineup24',
      html: passwordResetEmailHtml(code),
      text: passwordResetEmailText(code),
      kind: 'password-reset',
    });
  }

  async sendSignalTeaser(
    email: string,
    payload: { title: string; betId: string },
  ) {
    const siteUrl = this.frontendUrl();
    const ctaUrl = `${siteUrl}/dashboard/signals`;
    return this.sendMail({
      to: email,
      subject: `Новый сигнал: ${payload.title}`,
      html: signalTeaserEmailHtml({ title: payload.title, ctaUrl }),
      text: signalTeaserEmailText({ title: payload.title, ctaUrl }),
      kind: `signal:${payload.betId}`,
    });
  }

  async sendBroadcast(email: string, title: string, body: string) {
    return this.sendMail({
      to: email,
      subject: title,
      html: broadcastEmailHtml({ title, body }),
      text: broadcastEmailText({ title, body }),
      kind: 'broadcast',
    });
  }

  private async sendCodedEmail(opts: {
    email: string;
    code: string;
    subject: string;
    html: string;
    text: string;
    kind: string;
  }): Promise<SendVerificationResult> {
    const delivered = await this.sendMail({
      to: opts.email,
      subject: opts.subject,
      html: opts.html,
      text: opts.text,
      kind: opts.kind,
    });

    if (delivered) {
      return { delivered: true };
    }

    this.logger.warn(
      `SMTP unavailable for ${opts.kind}; code for ${opts.email}: ${opts.code}`,
    );
    if (this.exposeCodes()) {
      return { delivered: false, code: opts.code };
    }
    return { delivered: false };
  }

  private async sendMail(opts: {
    to: string;
    subject: string;
    html: string;
    text: string;
    kind: string;
  }): Promise<boolean> {
    const transporter = this.getTransporter();
    if (!transporter) {
      this.logger.warn(`SMTP not configured; skip ${opts.kind} → ${opts.to}`);
      return false;
    }

    const from =
      this.config.get<string>('SMTP_FROM')?.trim() ||
      this.config.get<string>('SMTP_USER')?.trim() ||
      'lineup24 <noreply@localhost>';

    try {
      const info = await transporter.sendMail({
        from,
        to: opts.to,
        subject: opts.subject,
        html: opts.html,
        text: opts.text,
      });
      this.logger.log(
        `Mail sent kind=${opts.kind} to=${opts.to} id=${info.messageId ?? 'n/a'}`,
      );
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Mail failed kind=${opts.kind} to=${opts.to}: ${message}`);
      return false;
    }
  }

  private getTransporter(): Transporter | null {
    if (this.transporter) {
      return this.transporter;
    }

    const host = this.config.get<string>('SMTP_HOST')?.trim();
    const user = this.config.get<string>('SMTP_USER')?.trim();
    const pass = this.config.get<string>('SMTP_PASS')?.trim();
    if (!host || !user || !pass) {
      return null;
    }

    const port = Number(this.config.get<string>('SMTP_PORT') ?? '465');
    const secureRaw = this.config.get<string>('SMTP_SECURE');
    const secure =
      secureRaw === undefined || secureRaw === ''
        ? port === 465
        : secureRaw === 'true' || secureRaw === '1';

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: { user, pass },
    });
    return this.transporter;
  }

  private frontendUrl() {
    return (
      this.config.get<string>('FRONTEND_URL')?.replace(/\/$/, '') ||
      'http://localhost:3000'
    );
  }

  private exposeCodes() {
    if (this.config.get<string>('MAIL_EXPOSE_CODES') === 'true') {
      return true;
    }
    return this.config.get<string>('NODE_ENV') !== 'production';
  }
}
