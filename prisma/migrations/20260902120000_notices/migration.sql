-- In-app notices (question answers, exhibition ending soon, etc.)
CREATE TABLE IF NOT EXISTS "Notice" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "body" TEXT,
  "href" TEXT,
  "readAt" TIMESTAMP(3),
  "dedupeKey" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "metadata" TEXT NOT NULL DEFAULT '{}',
  CONSTRAINT "Notice_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Notice_userId_type_dedupeKey_key"
  ON "Notice"("userId", "type", "dedupeKey");

CREATE INDEX IF NOT EXISTS "Notice_userId_createdAt_idx"
  ON "Notice"("userId", "createdAt");

CREATE INDEX IF NOT EXISTS "Notice_userId_readAt_idx"
  ON "Notice"("userId", "readAt");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Notice_userId_fkey'
  ) THEN
    ALTER TABLE "Notice"
      ADD CONSTRAINT "Notice_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
