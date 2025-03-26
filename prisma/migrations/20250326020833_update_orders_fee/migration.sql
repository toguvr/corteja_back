/*
  Warnings:

  - You are about to drop the column `paymentId` on the `orders` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "orders" DROP CONSTRAINT "orders_paymentId_fkey";

-- AlterTable
ALTER TABLE "orders" DROP COLUMN "paymentId";

-- AlterTable
ALTER TABLE "payments" ADD COLUMN     "orderId" TEXT;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;
