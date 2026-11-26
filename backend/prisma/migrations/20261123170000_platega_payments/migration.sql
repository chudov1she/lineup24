-- Drop Lava fields; add Platega transaction id
DROP INDEX IF EXISTS "PaymentOrder_lavaInvoiceId_key";

ALTER TABLE "PaymentOrder" DROP COLUMN IF EXISTS "lavaInvoiceId";
ALTER TABLE "PaymentOrder" DROP COLUMN IF EXISTS "offerId";

ALTER TABLE "PaymentOrder" ADD COLUMN IF NOT EXISTS "plategaTransactionId" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "PaymentOrder_plategaTransactionId_key" ON "PaymentOrder"("plategaTransactionId");
