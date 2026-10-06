-- 하루에 여러 일정이 있을 때, 달력 칸에 띄울 대표 이미지를 손님이 고른다
CREATE TABLE IF NOT EXISTS "CalendarDayCover" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "date" TEXT NOT NULL,
  "itemRef" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CalendarDayCover_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "CalendarDayCover_userId_date_key"
  ON "CalendarDayCover"("userId", "date");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'CalendarDayCover_userId_fkey'
  ) THEN
    ALTER TABLE "CalendarDayCover"
      ADD CONSTRAINT "CalendarDayCover_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
