/*
  Warnings:

  - You are about to drop the column `logo` on the `barbershops` table. All the data in the column will be lost.
  - You are about to drop the column `barbershopId` on the `customers` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "customers" DROP CONSTRAINT "customers_barbershopId_fkey";

-- AlterTable
ALTER TABLE "barbershops" DROP COLUMN "logo",
ADD COLUMN     "avatar" TEXT,
ADD COLUMN     "haveLoyalty" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "customers" DROP COLUMN "barbershopId",
ADD COLUMN     "avatar" TEXT;
