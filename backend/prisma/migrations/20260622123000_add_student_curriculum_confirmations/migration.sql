CREATE TABLE "student_curriculum_confirmations" (
  "id" TEXT NOT NULL,
  "student_id" TEXT NOT NULL,
  "curriculum_id" TEXT NOT NULL,
  "confirmed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "student_curriculum_confirmations_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "student_curriculum_confirmations_student_id_curriculum_id_key"
  ON "student_curriculum_confirmations"("student_id", "curriculum_id");

CREATE INDEX "student_curriculum_confirmations_student_id_idx"
  ON "student_curriculum_confirmations"("student_id");

CREATE INDEX "student_curriculum_confirmations_curriculum_id_idx"
  ON "student_curriculum_confirmations"("curriculum_id");

ALTER TABLE "student_curriculum_confirmations"
  ADD CONSTRAINT "student_curriculum_confirmations_student_id_fkey"
  FOREIGN KEY ("student_id") REFERENCES "students"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "student_curriculum_confirmations"
  ADD CONSTRAINT "student_curriculum_confirmations_curriculum_id_fkey"
  FOREIGN KEY ("curriculum_id") REFERENCES "curriculums"("id") ON DELETE CASCADE ON UPDATE CASCADE;
