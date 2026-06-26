CREATE TYPE "AiAdvisorSavedRecordType" AS ENUM ('RECOMMENDATION', 'EXPLANATION');

CREATE TABLE "ai_advisor_saved_recommendations" (
  "id" TEXT NOT NULL,
  "student_id" TEXT NOT NULL,
  "semester_id" TEXT,
  "course_offering_id" TEXT,
  "record_type" "AiAdvisorSavedRecordType" NOT NULL,
  "title" VARCHAR(120) NOT NULL,
  "question" TEXT,
  "request_payload" JSONB,
  "result_payload" JSONB NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ai_advisor_saved_recommendations_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ai_advisor_saved_recommendations_student_id_created_at_idx"
  ON "ai_advisor_saved_recommendations"("student_id", "created_at");

CREATE INDEX "ai_advisor_saved_recommendations_semester_id_idx"
  ON "ai_advisor_saved_recommendations"("semester_id");

CREATE INDEX "ai_advisor_saved_recommendations_course_offering_id_idx"
  ON "ai_advisor_saved_recommendations"("course_offering_id");

ALTER TABLE "ai_advisor_saved_recommendations"
  ADD CONSTRAINT "ai_advisor_saved_recommendations_student_id_fkey"
  FOREIGN KEY ("student_id") REFERENCES "students"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ai_advisor_saved_recommendations"
  ADD CONSTRAINT "ai_advisor_saved_recommendations_semester_id_fkey"
  FOREIGN KEY ("semester_id") REFERENCES "semesters"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ai_advisor_saved_recommendations"
  ADD CONSTRAINT "ai_advisor_saved_recommendations_course_offering_id_fkey"
  FOREIGN KEY ("course_offering_id") REFERENCES "course_offerings"("id") ON DELETE SET NULL ON UPDATE CASCADE;
