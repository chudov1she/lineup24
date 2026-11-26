import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import nodemailer from 'nodemailer'
import {
  broadcastEmailHtml,
  broadcastEmailText,
  passwordResetEmailHtml,
  passwordResetEmailText,
  signalTeaserEmailHtml,
  signalTeaserEmailText,
  verificationEmailHtml,
  verificationEmailText,
} from '../src/mail/mail.templates.js'

function loadEnv(path: string) {
  const raw = readFileSync(path, 'utf8')
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq < 0) continue
    const key = trimmed.slice(0, eq).trim()
    let value = trimmed.slice(eq + 1).trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    if (!(key in process.env)) process.env[key] = value
  }
}

loadEnv(resolve(process.cwd(), '.env'))

const to = process.argv[2] || process.env.SMTP_USER
if (!to) {
  console.error('No recipient email')
  process.exit(1)
}

const host = process.env.SMTP_HOST
const user = process.env.SMTP_USER
const pass = process.env.SMTP_PASS
const port = Number(process.env.SMTP_PORT || '465')
const secure =
  process.env.SMTP_SECURE === undefined || process.env.SMTP_SECURE === ''
    ? port === 465
    : process.env.SMTP_SECURE === 'true' || process.env.SMTP_SECURE === '1'
const from = process.env.SMTP_FROM || user

if (!host || !user || !pass) {
  console.error('SMTP is not configured')
  process.exit(1)
}

const transporter = nodemailer.createTransport({
  host,
  port,
  secure,
  auth: { user, pass },
})

const sampleCode = '614253'
const siteUrl = (process.env.FRONTEND_URL || 'http://localhost:3000').replace(
  /\/$/,
  '',
)

const mails = [
  {
    subject: 'Подтверждение регистрации: код для email — lineup24',
    html: verificationEmailHtml(sampleCode),
    text: verificationEmailText(sampleCode),
  },
  {
    subject: 'Сброс пароля: код для смены пароля — lineup24',
    html: passwordResetEmailHtml(sampleCode),
    text: passwordResetEmailText(sampleCode),
  },
  {
    subject: 'Новый сигнал: Превью шаблона — lineup24',
    html: signalTeaserEmailHtml({
      title: 'Превью шаблона сигнала',
      ctaUrl: `${siteUrl}/dashboard/signals`,
    }),
    text: signalTeaserEmailText({
      title: 'Превью шаблона сигнала',
      ctaUrl: `${siteUrl}/dashboard/signals`,
    }),
  },
  {
    subject: 'Рассылка: превью шаблона — lineup24',
    html: broadcastEmailHtml({
      title: 'Превью рассылки',
      body: 'Это тестовое письмо по шаблону broadcast.\nПроверьте вёрстку и фон.',
    }),
    text: broadcastEmailText({
      title: 'Превью рассылки',
      body: 'Это тестовое письмо по шаблону broadcast.\nПроверьте вёрстку и фон.',
    }),
  },
]

for (const mail of mails) {
  const info = await transporter.sendMail({
    from,
    to,
    subject: mail.subject,
    html: mail.html,
    text: mail.text,
  })
  console.log(`sent: ${mail.subject} → ${to} id=${info.messageId ?? 'n/a'}`)
}
