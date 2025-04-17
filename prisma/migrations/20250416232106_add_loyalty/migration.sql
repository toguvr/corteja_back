-- AlterTable
ALTER TABLE "barbershops" ADD COLUMN     "loyaltyReward" INTEGER DEFAULT 4000,
ADD COLUMN     "loyaltyStamps" INTEGER DEFAULT 10,
ADD COLUMN     "weeksToSchedule" INTEGER DEFAULT 2;

-- CreateTable
CREATE TABLE "loyaltyStamps" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "barbershopId" TEXT NOT NULL,
    "paymentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "loyaltyStamps_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "loyaltyStamps" ADD CONSTRAINT "loyaltyStamps_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "loyaltyStamps" ADD CONSTRAINT "loyaltyStamps_barbershopId_fkey" FOREIGN KEY ("barbershopId") REFERENCES "barbershops"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "loyaltyStamps" ADD CONSTRAINT "loyaltyStamps_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "payments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
