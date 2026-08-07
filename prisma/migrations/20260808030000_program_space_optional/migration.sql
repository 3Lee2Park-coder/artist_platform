-- AlterTable
ALTER TABLE "Program" ALTER COLUMN "spaceId" DROP NOT NULL;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Program_exhibitionId_idx" ON "Program"("exhibitionId");
