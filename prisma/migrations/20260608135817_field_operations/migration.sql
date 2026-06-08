-- CreateEnum
CREATE TYPE "HouseholdStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'RELOCATED', 'DECEASED');

-- CreateTable
CREATE TABLE "routes" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "collector_id" UUID,
    "name" TEXT NOT NULL,
    "sector" TEXT NOT NULL,
    "cell" TEXT,
    "description" TEXT,
    "collection_day" INTEGER,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "routes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "households" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "collector_id" UUID,
    "route_id" UUID,
    "household_code" TEXT NOT NULL,
    "resident_name" TEXT NOT NULL,
    "phone_number" TEXT NOT NULL,
    "momo_number" TEXT,
    "sector" TEXT NOT NULL,
    "cell" TEXT NOT NULL,
    "village" TEXT,
    "address" TEXT,
    "latitude" DECIMAL(9,6),
    "longitude" DECIMAL(9,6),
    "monthly_fee_rwf" INTEGER NOT NULL,
    "collection_day" INTEGER NOT NULL,
    "status" "HouseholdStatus" NOT NULL DEFAULT 'ACTIVE',
    "verified_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "households_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "household_fee_history" (
    "id" UUID NOT NULL,
    "household_id" UUID NOT NULL,
    "previous_fee_rwf" INTEGER,
    "new_fee_rwf" INTEGER NOT NULL,
    "effective_from" TIMESTAMP(3) NOT NULL,
    "reason" TEXT,
    "changed_by_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "household_fee_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "routes_company_id_collector_id_idx" ON "routes"("company_id", "collector_id");

-- CreateIndex
CREATE INDEX "households_company_id_status_idx" ON "households"("company_id", "status");

-- CreateIndex
CREATE INDEX "households_collector_id_idx" ON "households"("collector_id");

-- CreateIndex
CREATE INDEX "households_route_id_idx" ON "households"("route_id");

-- CreateIndex
CREATE UNIQUE INDEX "households_company_id_household_code_key" ON "households"("company_id", "household_code");

-- CreateIndex
CREATE INDEX "household_fee_history_household_id_effective_from_idx" ON "household_fee_history"("household_id", "effective_from");

-- AddForeignKey
ALTER TABLE "routes" ADD CONSTRAINT "routes_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "routes" ADD CONSTRAINT "routes_collector_id_fkey" FOREIGN KEY ("collector_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "households" ADD CONSTRAINT "households_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "households" ADD CONSTRAINT "households_collector_id_fkey" FOREIGN KEY ("collector_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "households" ADD CONSTRAINT "households_route_id_fkey" FOREIGN KEY ("route_id") REFERENCES "routes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "household_fee_history" ADD CONSTRAINT "household_fee_history_household_id_fkey" FOREIGN KEY ("household_id") REFERENCES "households"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
