-- CreateEnum
CREATE TYPE "MomoCollectionStatus" AS ENUM ('PENDING', 'SUCCESSFUL', 'FAILED');

-- CreateTable
CREATE TABLE "momo_collections" (
    "id" UUID NOT NULL,
    "reference_id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "household_id" UUID NOT NULL,
    "charge_id" UUID NOT NULL,
    "billing_period_id" UUID,
    "payer_phone" TEXT NOT NULL,
    "amount_rwf" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "external_id" TEXT NOT NULL,
    "status" "MomoCollectionStatus" NOT NULL DEFAULT 'PENDING',
    "financial_transaction_id" TEXT,
    "failure_reason" TEXT,
    "initiated_by_id" UUID,
    "payment_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "momo_collections_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "momo_collections_reference_id_key" ON "momo_collections"("reference_id");

-- CreateIndex
CREATE UNIQUE INDEX "momo_collections_payment_id_key" ON "momo_collections"("payment_id");

-- CreateIndex
CREATE INDEX "momo_collections_company_id_status_idx" ON "momo_collections"("company_id", "status");

-- CreateIndex
CREATE INDEX "momo_collections_household_id_idx" ON "momo_collections"("household_id");

-- AddForeignKey
ALTER TABLE "momo_collections" ADD CONSTRAINT "momo_collections_household_id_fkey" FOREIGN KEY ("household_id") REFERENCES "households"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "momo_collections" ADD CONSTRAINT "momo_collections_charge_id_fkey" FOREIGN KEY ("charge_id") REFERENCES "charges"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "momo_collections" ADD CONSTRAINT "momo_collections_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "payments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
