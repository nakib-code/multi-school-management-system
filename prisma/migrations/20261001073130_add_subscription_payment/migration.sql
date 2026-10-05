-- CreateEnum
CREATE TYPE "SubscriptionPaymentMethod" AS ENUM ('ONLINE', 'CASH');

-- CreateEnum
CREATE TYPE "SubscriptionPaymentStatus" AS ENUM ('PENDING', 'PAID', 'FAILED', 'CANCELLED');

-- CreateTable
CREATE TABLE "subscription_payments" (
    "id" SERIAL NOT NULL,
    "subscriptionId" INTEGER NOT NULL,
    "schoolId" INTEGER NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'BDT',
    "status" "SubscriptionPaymentStatus" NOT NULL DEFAULT 'PENDING',
    "paymentMethod" "SubscriptionPaymentMethod" NOT NULL DEFAULT 'ONLINE',
    "transactionId" TEXT,
    "validationId" TEXT,
    "gatewayAmount" DECIMAL(10,2),
    "gatewayCurrency" TEXT,
    "paidAt" TIMESTAMP(3),
    "remarks" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscription_payments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "subscription_payments_transactionId_key" ON "subscription_payments"("transactionId");

-- CreateIndex
CREATE UNIQUE INDEX "subscription_payments_validationId_key" ON "subscription_payments"("validationId");

-- CreateIndex
CREATE INDEX "subscription_payments_subscriptionId_idx" ON "subscription_payments"("subscriptionId");

-- CreateIndex
CREATE INDEX "subscription_payments_schoolId_idx" ON "subscription_payments"("schoolId");

-- CreateIndex
CREATE INDEX "subscription_payments_status_idx" ON "subscription_payments"("status");

-- CreateIndex
CREATE INDEX "subscription_payments_paymentMethod_idx" ON "subscription_payments"("paymentMethod");

-- CreateIndex
CREATE INDEX "subscription_payments_createdAt_idx" ON "subscription_payments"("createdAt");

-- AddForeignKey
ALTER TABLE "subscription_payments" ADD CONSTRAINT "subscription_payments_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "school_subscriptions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription_payments" ADD CONSTRAINT "subscription_payments_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
