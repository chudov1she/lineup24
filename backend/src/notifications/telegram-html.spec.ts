import { describe, expect, it } from 'vitest';
import {
  escapeTelegramHtml,
  telegramBold,
  telegramCode,
  telegramLink,
} from './telegram-html.js';

describe('telegram-html', () => {
  it('escapes HTML special chars', () => {
    expect(escapeTelegramHtml('a<b>&c')).toBe('a&lt;b&gt;&amp;c');
  });

  it('wraps bold/code safely for base64url tokens with underscores', () => {
    const token = 'abc_def-ghi';
    expect(telegramCode(token)).toBe('<code>abc_def-ghi</code>');
    expect(telegramBold('Настройки → Telegram')).toBe(
      '<b>Настройки → Telegram</b>',
    );
  });

  it('builds links with escaped label', () => {
    expect(telegramLink('открыть <x>', 'https://example.com/a')).toBe(
      '<a href="https://example.com/a">открыть &lt;x&gt;</a>',
    );
  });
});
