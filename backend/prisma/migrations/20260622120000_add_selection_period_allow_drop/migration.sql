ALTER TABLE "selection_periods"
  ADD COLUMN "allow_drop" BOOLEAN NOT NULL DEFAULT false;

UPDATE "selection_periods"
SET "allow_drop" = true
WHERE "phase" IN ('SECOND_ROUND', 'ADJUSTMENT');
