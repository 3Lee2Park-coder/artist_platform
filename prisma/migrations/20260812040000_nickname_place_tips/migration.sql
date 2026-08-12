-- Nickname (unique, case-insensitive via nicknameNormalized)
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "nickname" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "nicknameNormalized" TEXT;

-- Backfill unique nicknames from name for existing users
UPDATE "User" AS u
SET
  "nickname" = left(regexp_replace(coalesce(u."name", 'user'), '\s+', '', 'g'), 16)
    || CASE
      WHEN EXISTS (
        SELECT 1 FROM "User" u2
        WHERE u2.id <> u.id
          AND lower(
            left(regexp_replace(coalesce(u2."name", 'user'), '\s+', '', 'g'), 16)
          ) = lower(
            left(regexp_replace(coalesce(u."name", 'user'), '\s+', '', 'g'), 16)
          )
          AND u2.id < u.id
      ) THEN right(u.id, 4)
      ELSE ''
    END,
  "nicknameNormalized" = lower(
    left(regexp_replace(coalesce(u."name", 'user'), '\s+', '', 'g'), 16)
      || CASE
        WHEN EXISTS (
          SELECT 1 FROM "User" u2
          WHERE u2.id <> u.id
            AND lower(
              left(regexp_replace(coalesce(u2."name", 'user'), '\s+', '', 'g'), 16)
            ) = lower(
              left(regexp_replace(coalesce(u."name", 'user'), '\s+', '', 'g'), 16)
            )
            AND u2.id < u.id
        ) THEN right(u.id, 4)
        ELSE ''
      END
  )
WHERE u."nicknameNormalized" IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "User_nicknameNormalized_key"
  ON "User"("nicknameNormalized");

-- Place discovery fields
ALTER TABLE "Place" ADD COLUMN IF NOT EXISTS "imageUrl" TEXT;
ALTER TABLE "Place" ADD COLUMN IF NOT EXISTS "editorialNote" TEXT;
ALTER TABLE "Place" ADD COLUMN IF NOT EXISTS "homeFeatured" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Place" ADD COLUMN IF NOT EXISTS "homeSortOrder" INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS "Place_homeFeatured_homeSortOrder_idx"
  ON "Place"("homeFeatured", "homeSortOrder");

-- Place tips
CREATE TABLE IF NOT EXISTS "PlaceTip" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "sourceUrl" TEXT,
  "situation" TEXT NOT NULL,
  "district" TEXT NOT NULL,
  "imageUrl" TEXT,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "placeId" TEXT,
  "adminNote" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PlaceTip_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "PlaceTip_status_createdAt_idx"
  ON "PlaceTip"("status", "createdAt");

CREATE INDEX IF NOT EXISTS "PlaceTip_userId_createdAt_idx"
  ON "PlaceTip"("userId", "createdAt");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'PlaceTip_userId_fkey'
  ) THEN
    ALTER TABLE "PlaceTip"
      ADD CONSTRAINT "PlaceTip_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'PlaceTip_placeId_fkey'
  ) THEN
    ALTER TABLE "PlaceTip"
      ADD CONSTRAINT "PlaceTip_placeId_fkey"
      FOREIGN KEY ("placeId") REFERENCES "Place"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
