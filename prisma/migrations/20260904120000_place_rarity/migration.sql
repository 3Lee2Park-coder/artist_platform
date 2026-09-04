-- Place 카드 희귀도. null이면 기존 규칙(홈 노출이면 HIDDEN, 아니면 COMMON)
ALTER TABLE "Place" ADD COLUMN IF NOT EXISTS "rarity" TEXT;
