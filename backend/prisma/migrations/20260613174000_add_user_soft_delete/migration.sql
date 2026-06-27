-- Add soft delete support for users
ALTER TABLE "users"
ADD COLUMN "deleted_at" TIMESTAMP(3);

-- Support include_deleted filtering and sorting
CREATE INDEX "users_deleted_at_idx" ON "users"("deleted_at");
