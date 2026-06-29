-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('MOMO_MTN', 'MOMO_AIRTEL', 'EKASH', 'CASH', 'OTHER');

-- CreateEnum
CREATE TYPE "PaymentSource" AS ENUM ('SYSTEM', 'COLLECTOR', 'HOUSEHOLD_CLAIM');

-- CreateEnum
CREATE TYPE "PaymentProofStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "payments" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "household_id" UUID NOT NULL,
    "charge_id" UUID,
    "billing_period_id" UUID,
    "collector_id" UUID,
    "amount_rwf" INTEGER NOT NULL,
    "payment_method" "PaymentMethod" NOT NULL,
    "momo_transaction_id" TEXT,
    "source" "PaymentSource" NOT NULL DEFAULT 'COLLECTOR',
    "paid_at" TIMESTAMP(3) NOT NULL,
    "note" TEXT,
    "recorded_by_id" UUID,
    "is_reversed" BOOLEAN NOT NULL DEFAULT false,
    "reversal_reason" TEXT,
    "reversed_by_id" UUID,
    "reversed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_proofs" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "household_id" UUID NOT NULL,
    "billing_period_id" UUID,
    "charge_id" UUID,
    "submitted_by_id" UUID,
    "claimed_amount_rwf" INTEGER NOT NULL,
    "payment_method" "PaymentMethod" NOT NULL,
    "momo_transaction_id" TEXT,
    "proof_image_url" TEXT,
    "note" TEXT,
    "status" "PaymentProofStatus" NOT NULL DEFAULT 'PENDING',
    "reviewed_by_id" UUID,
    "reviewed_at" TIMESTAMP(3),
    "rejection_reason" TEXT,
    "payment_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payment_proofs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "payments_momo_transaction_id_key" ON "payments"("momo_transaction_id");

-- CreateIndex
CREATE INDEX "payments_household_id_idx" ON "payments"("household_id");

-- CreateIndex
CREATE INDEX "payments_company_id_idx" ON "payments"("company_id");

-- CreateIndex
CREATE INDEX "payments_charge_id_idx" ON "payments"("charge_id");

-- CreateIndex
CREATE INDEX "payments_collector_id_idx" ON "payments"("collector_id");

-- CreateIndex
CREATE UNIQUE INDEX "payment_proofs_payment_id_key" ON "payment_proofs"("payment_id");

-- CreateIndex
CREATE INDEX "payment_proofs_company_id_status_idx" ON "payment_proofs"("company_id", "status");

-- CreateIndex
CREATE INDEX "payment_proofs_household_id_idx" ON "payment_proofs"("household_id");

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_household_id_fkey" FOREIGN KEY ("household_id") REFERENCES "households"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_charge_id_fkey" FOREIGN KEY ("charge_id") REFERENCES "charges"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_collector_id_fkey" FOREIGN KEY ("collector_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_proofs" ADD CONSTRAINT "payment_proofs_household_id_fkey" FOREIGN KEY ("household_id") REFERENCES "households"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_proofs" ADD CONSTRAINT "payment_proofs_charge_id_fkey" FOREIGN KEY ("charge_id") REFERENCES "charges"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_proofs" ADD CONSTRAINT "payment_proofs_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "payments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
