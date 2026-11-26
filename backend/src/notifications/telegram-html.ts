/** Escape user/dynamic text for Telegram HTML parse_mode. */
export function escapeTelegramHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

export function telegramBold(value: string): string {
  return `<b>${escapeTelegramHtml(value)}</b>`;
}

export function telegramCode(value: string): string {
  return `<code>${escapeTelegramHtml(value)}</code>`;
}

export function telegramLink(label: string, href: string): string {
  const safeHref = href.replaceAll('"', '%22');
  return `<a href="${safeHref}">${escapeTelegramHtml(label)}</a>`;
}
