/*
  Warnings:

  - You are about to drop the column `customerId` on the `customers` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "customers" DROP CONSTRAINT "customers_barbershopId_fkey";

-- AlterTable
ALTER TABLE "barbershops" ADD COLUMN     "fee" INTEGER DEFAULT 10;

-- AlterTable
ALTER TABLE "customers" DROP COLUMN "customerId",
ALTER COLUMN "barbershopId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "customers" ADD CONSTRAINT "customers_barbershopId_fkey" FOREIGN KEY ("barbershopId") REFERENCES "barbershops"("id") ON DELETE SET NULL ON UPDATE CASCADE;
