-- P1 question intake. Separate from "ArtistQuestion".
CREATE TABLE IF NOT EXISTS "Question" (
  "id" TEXT NOT NULL,
  "userId" TEXT,
  "contactEmail" TEXT,
  "exhibitionId" TEXT,
  "artistId" TEXT,
  "workId" TEXT,
  "venueId" TEXT,
  "text" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'submitted',
  "audience" TEXT NOT NULL DEFAULT 'private',
  "notifyOnAnswer" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Question_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Question_context_check" CHECK (
    "exhibitionId" IS NOT NULL
    OR "artistId" IS NOT NULL
    OR "workId" IS NOT NULL
    OR "venueId" IS NOT NULL
  ),
  CONSTRAINT "Question_status_check" CHECK (
    "status" IN ('submitted', 'sent', 'answered', 'closed', 'rejected')
  ),
  CONSTRAINT "Question_audience_check" CHECK (
    "audience" IN ('private', 'public_candidate')
  )
);

CREATE TABLE IF NOT EXISTS "QuestionRecipient" (
  "id" TEXT NOT NULL,
  "questionId" TEXT NOT NULL,
  "recipientType" TEXT NOT NULL,
  "recipientId" TEXT,
  "contactChannel" TEXT NOT NULL,
  "sentAt" TIMESTAMP(3),
  "deliveredAt" TIMESTAMP(3),
  "respondedAt" TIMESTAMP(3),
  "opsNote" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "QuestionRecipient_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "QuestionRecipient_type_check" CHECK (
    "recipientType" IN ('artist', 'gallery', 'organizer', 'ooof')
  )
);

CREATE TABLE IF NOT EXISTS "QuestionAnswer" (
  "id" TEXT NOT NULL,
  "questionId" TEXT NOT NULL,
  "responderId" TEXT,
  "text" TEXT NOT NULL,
  "visibility" TEXT NOT NULL DEFAULT 'private',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "QuestionAnswer_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "QuestionAnswer_visibility_check" CHECK (
    "visibility" IN ('private', 'public', 'withdrawn')
  )
);

CREATE TABLE IF NOT EXISTS "QuestionResponseToken" (
  "id" TEXT NOT NULL,
  "questionId" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "usedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "QuestionResponseToken_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "QuestionNotification" (
  "id" TEXT NOT NULL,
  "questionId" TEXT NOT NULL,
  "userId" TEXT,
  "channel" TEXT NOT NULL,
  "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "readAt" TIMESTAMP(3),
  CONSTRAINT "QuestionNotification_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "QuestionResponseToken_tokenHash_key"
  ON "QuestionResponseToken"("tokenHash");

CREATE INDEX IF NOT EXISTS "Question_status_createdAt_idx" ON "Question"("status", "createdAt");
CREATE INDEX IF NOT EXISTS "Question_exhibitionId_idx" ON "Question"("exhibitionId");
CREATE INDEX IF NOT EXISTS "Question_artistId_idx" ON "Question"("artistId");
CREATE INDEX IF NOT EXISTS "Question_workId_idx" ON "Question"("workId");
CREATE INDEX IF NOT EXISTS "Question_venueId_idx" ON "Question"("venueId");
CREATE INDEX IF NOT EXISTS "Question_userId_idx" ON "Question"("userId");
CREATE INDEX IF NOT EXISTS "QuestionRecipient_questionId_idx" ON "QuestionRecipient"("questionId");
CREATE INDEX IF NOT EXISTS "QuestionAnswer_questionId_visibility_idx" ON "QuestionAnswer"("questionId", "visibility");
CREATE INDEX IF NOT EXISTS "QuestionResponseToken_questionId_idx" ON "QuestionResponseToken"("questionId");
CREATE INDEX IF NOT EXISTS "QuestionNotification_questionId_sentAt_idx" ON "QuestionNotification"("questionId", "sentAt");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Question_userId_fkey') THEN
    ALTER TABLE "Question" ADD CONSTRAINT "Question_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Question_artistId_fkey') THEN
    ALTER TABLE "Question" ADD CONSTRAINT "Question_artistId_fkey"
      FOREIGN KEY ("artistId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Question_exhibitionId_fkey') THEN
    ALTER TABLE "Question" ADD CONSTRAINT "Question_exhibitionId_fkey"
      FOREIGN KEY ("exhibitionId") REFERENCES "Exhibition"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Question_workId_fkey') THEN
    ALTER TABLE "Question" ADD CONSTRAINT "Question_workId_fkey"
      FOREIGN KEY ("workId") REFERENCES "Artwork"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Question_venueId_fkey') THEN
    ALTER TABLE "Question" ADD CONSTRAINT "Question_venueId_fkey"
      FOREIGN KEY ("venueId") REFERENCES "Place"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'QuestionRecipient_questionId_fkey') THEN
    ALTER TABLE "QuestionRecipient" ADD CONSTRAINT "QuestionRecipient_questionId_fkey"
      FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'QuestionAnswer_questionId_fkey') THEN
    ALTER TABLE "QuestionAnswer" ADD CONSTRAINT "QuestionAnswer_questionId_fkey"
      FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'QuestionAnswer_responderId_fkey') THEN
    ALTER TABLE "QuestionAnswer" ADD CONSTRAINT "QuestionAnswer_responderId_fkey"
      FOREIGN KEY ("responderId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'QuestionResponseToken_questionId_fkey') THEN
    ALTER TABLE "QuestionResponseToken" ADD CONSTRAINT "QuestionResponseToken_questionId_fkey"
      FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'QuestionNotification_questionId_fkey') THEN
    ALTER TABLE "QuestionNotification" ADD CONSTRAINT "QuestionNotification_questionId_fkey"
      FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'QuestionNotification_userId_fkey') THEN
    ALTER TABLE "QuestionNotification" ADD CONSTRAINT "QuestionNotification_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
