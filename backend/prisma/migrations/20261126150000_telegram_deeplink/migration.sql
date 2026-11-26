-- Deep-link flow: site creates token with userId before chat exists.
ALTER TABLE "TelegramLinkToken" ALTER COLUMN "chatId" DROP NOT NULL;

CREATE INDEX IF NOT EXISTS "TelegramLinkToken_userId_consumedAt_idx"
  ON "TelegramLinkToken"("userId", "consumedAt");
