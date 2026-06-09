-- CreateEnum
CREATE TYPE "BillingPeriodStatus" AS ENUM ('OPEN', 'ACTIVE', 'CLOSED');

-- CreateEnum
CREATE TYPE "ChargeStatus" AS ENUM ('PENDING', 'PAID', 'PARTIALLY_PAID', 'OVERDUE', 'WAIVED');

-- CreateTable
CREATE TABLE "billing_periods" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "period_start" DATE NOT NULL,
    "period_end" DATE NOT NULL,
    "status" "BillingPeriodStatus" NOT NULL DEFAULT 'OPEN',
    "charges_generated_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "billing_periods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "charges" (
    "id" UUID NOT NULL,
    "billing_period_id" UUID NOT NULL,
    "household_id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "base_fee_rwf" INTEGER NOT NULL,
    "late_fee_rwf" INTEGER NOT NULL DEFAULT 0,
    "total_amount_rwf" INTEGER NOT NULL,
    "amount_paid_rwf" INTEGER NOT NULL DEFAULT 0,
    "status" "ChargeStatus" NOT NULL DEFAULT 'PENDING',
    "due_date" DATE NOT NULL,
    "paid_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "charges_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "billing_periods_company_id_status_idx" ON "billing_periods"("company_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "billing_periods_company_id_year_month_key" ON "billing_periods"("company_id", "year", "month");

-- CreateIndex
CREATE INDEX "charges_household_id_status_idx" ON "charges"("household_id", "status");

-- CreateIndex
CREATE INDEX "charges_company_id_status_idx" ON "charges"("company_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "charges_billing_period_id_household_id_key" ON "charges"("billing_period_id", "household_id");

-- AddForeignKey
ALTER TABLE "billing_periods" ADD CONSTRAINT "billing_periods_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "charges" ADD CONSTRAINT "charges_billing_period_id_fkey" FOREIGN KEY ("billing_period_id") REFERENCES "billing_periods"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "charges" ADD CONSTRAINT "charges_household_id_fkey" FOREIGN KEY ("household_id") REFERENCES "households"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
