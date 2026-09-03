-- Home hero pin for exhibitions (optional; newest fill the rest)
ALTER TABLE "Exhibition" ADD COLUMN IF NOT EXISTS "homeHero" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS "Exhibition_homeHero_createdAt_idx"
  ON "Exhibition"("homeHero", "createdAt");

-- Artist opt-in to appear as a walker (floating avatar) on the home page
ALTER TABLE "ArtistApplication" ADD COLUMN IF NOT EXISTS "showOnHome" BOOLEAN NOT NULL DEFAULT false;

-- Audience questions to artists (registered or unlisted), always moderated
CREATE TABLE IF NOT EXISTS "ArtistQuestion" (
  "id" TEXT NOT NULL,
  "kind" TEXT NOT NULL DEFAULT 'REGISTERED',
  "topic" TEXT NOT NULL,
  "artistUserId" TEXT,
  "unlistedArtistName" TEXT,
  "exhibitionId" TEXT,
  "fromUserId" TEXT,
  "fromName" TEXT NOT NULL,
  "fromEmail" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "adminNote" TEXT,
  "answer" TEXT,
  "answeredAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ArtistQuestion_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "ArtistQuestion_status_createdAt_idx"
  ON "ArtistQuestion"("status", "createdAt");

CREATE INDEX IF NOT EXISTS "ArtistQuestion_artistUserId_status_idx"
  ON "ArtistQuestion"("artistUserId", "status");

CREATE INDEX IF NOT EXISTS "ArtistQuestion_fromEmail_createdAt_idx"
  ON "ArtistQuestion"("fromEmail", "createdAt");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ArtistQuestion_artistUserId_fkey'
  ) THEN
    ALTER TABLE "ArtistQuestion"
      ADD CONSTRAINT "ArtistQuestion_artistUserId_fkey"
      FOREIGN KEY ("artistUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ArtistQuestion_fromUserId_fkey'
  ) THEN
    ALTER TABLE "ArtistQuestion"
      ADD CONSTRAINT "ArtistQuestion_fromUserId_fkey"
      FOREIGN KEY ("fromUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ArtistQuestion_exhibitionId_fkey'
  ) THEN
    ALTER TABLE "ArtistQuestion"
      ADD CONSTRAINT "ArtistQuestion_exhibitionId_fkey"
      FOREIGN KEY ("exhibitionId") REFERENCES "Exhibition"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
