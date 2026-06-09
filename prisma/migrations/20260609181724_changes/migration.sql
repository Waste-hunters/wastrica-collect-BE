/*
  Warnings:

  - A unique constraint covering the columns `[email]` on the table `households` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[household_id]` on the table `users` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "households" ADD COLUMN     "email" TEXT,
ADD COLUMN     "email_verified_at" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "household_id" UUID,
ADD COLUMN     "password_hash" TEXT;

-- CreateTable
CREATE TABLE "email_otp_challenges" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "code_hash" TEXT NOT NULL,
    "consumed_at" TIMESTAMP(3),
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "email_otp_challenges_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "email_otp_challenges_email_expires_at_idx" ON "email_otp_challenges"("email", "expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "households_email_key" ON "households"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_household_id_key" ON "users"("household_id");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_household_id_fkey" FOREIGN KEY ("household_id") REFERENCES "households"("id") ON DELETE SET NULL ON UPDATE CASCADE;
