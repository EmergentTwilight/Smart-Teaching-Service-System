-- Add stable timestamps for departments
ALTER TABLE "departments"
ADD COLUMN "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Backfill updated_at for existing rows
UPDATE "departments"
SET "updated_at" = "created_at"
WHERE "updated_at" IS NULL;
