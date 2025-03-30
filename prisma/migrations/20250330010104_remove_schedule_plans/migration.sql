/*
  Warnings:

  - You are about to drop the column `scheduleId` on the `plans` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "plans" DROP CONSTRAINT "plans_scheduleId_fkey";

-- AlterTable
ALTER TABLE "plans" DROP COLUMN "scheduleId";
