-- Date-based card/deck archive (visited days + planned weekend courses)
CREATE TABLE IF NOT EXISTS "CalendarEntry" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "date" TEXT NOT NULL,
  "kind" TEXT NOT NULL,
  "cardKey" TEXT,
  "deckId" TEXT,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CalendarEntry_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "CalendarEntry_userId_date_idx"
  ON "CalendarEntry"("userId", "date");

CREATE INDEX IF NOT EXISTS "CalendarEntry_deckId_idx"
  ON "CalendarEntry"("deckId");

CREATE TABLE IF NOT EXISTS "CalendarShare" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "date" TEXT NOT NULL,
  "shareToken" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CalendarShare_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "CalendarShare_shareToken_key"
  ON "CalendarShare"("shareToken");

CREATE UNIQUE INDEX IF NOT EXISTS "CalendarShare_userId_date_key"
  ON "CalendarShare"("userId", "date");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'CalendarEntry_userId_fkey'
  ) THEN
    ALTER TABLE "CalendarEntry"
      ADD CONSTRAINT "CalendarEntry_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'CalendarEntry_deckId_fkey'
  ) THEN
    ALTER TABLE "CalendarEntry"
      ADD CONSTRAINT "CalendarEntry_deckId_fkey"
      FOREIGN KEY ("deckId") REFERENCES "UserDeck"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'CalendarShare_userId_fkey'
  ) THEN
    ALTER TABLE "CalendarShare"
      ADD CONSTRAINT "CalendarShare_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
