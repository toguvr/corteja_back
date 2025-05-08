-- AlterTable
ALTER TABLE "chats" ADD COLUMN     "scheduleId" TEXT;

-- AddForeignKey
ALTER TABLE "chats" ADD CONSTRAINT "chats_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "schedules"("id") ON DELETE SET NULL ON UPDATE CASCADE;
