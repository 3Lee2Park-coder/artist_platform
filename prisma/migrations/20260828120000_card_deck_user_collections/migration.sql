-- User collections for CARD + DECK (source content stays on Curation / Exhibition / Place)
ALTER TABLE "Visit" ADD COLUMN IF NOT EXISTS "placeId" TEXT;
ALTER TABLE "Visit" ADD COLUMN IF NOT EXISTS "photoUrl" TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Visit_placeId_fkey'
  ) THEN
    ALTER TABLE "Visit"
      ADD CONSTRAINT "Visit_placeId_fkey"
      FOREIGN KEY ("placeId") REFERENCES "Place"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "Visit_userId_placeId_key" ON "Visit"("userId", "placeId");

CREATE TABLE IF NOT EXISTS "SavedCard" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "cardKey" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SavedCard_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "SavedCard_userId_cardKey_key" ON "SavedCard"("userId", "cardKey");
CREATE INDEX IF NOT EXISTS "SavedCard_userId_createdAt_idx" ON "SavedCard"("userId", "createdAt");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'SavedCard_userId_fkey'
  ) THEN
    ALTER TABLE "SavedCard"
      ADD CONSTRAINT "SavedCard_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "UserDeck" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "subtitle" TEXT,
  "accentColor" TEXT NOT NULL DEFAULT '#C46D54',
  "shareToken" TEXT,
  "isPublic" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "UserDeck_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "UserDeck_shareToken_key" ON "UserDeck"("shareToken");
CREATE INDEX IF NOT EXISTS "UserDeck_userId_updatedAt_idx" ON "UserDeck"("userId", "updatedAt");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'UserDeck_userId_fkey'
  ) THEN
    ALTER TABLE "UserDeck"
      ADD CONSTRAINT "UserDeck_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "UserDeckCard" (
  "id" TEXT NOT NULL,
  "deckId" TEXT NOT NULL,
  "cardKey" TEXT NOT NULL,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "UserDeckCard_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "UserDeckCard_deckId_cardKey_key" ON "UserDeckCard"("deckId", "cardKey");
CREATE INDEX IF NOT EXISTS "UserDeckCard_deckId_sortOrder_idx" ON "UserDeckCard"("deckId", "sortOrder");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'UserDeckCard_deckId_fkey'
  ) THEN
    ALTER TABLE "UserDeckCard"
      ADD CONSTRAINT "UserDeckCard_deckId_fkey"
      FOREIGN KEY ("deckId") REFERENCES "UserDeck"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
