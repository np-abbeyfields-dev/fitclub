-- BETA_MMR: Temporary. Remove when dropping MMR sync (search BETA_MMR in codebase).
-- Add unique nullable column for MMR workout ID to dedupe imports.
ALTER TABLE "Workout" ADD COLUMN IF NOT EXISTS "mmrWorkoutId" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "Workout_mmrWorkoutId_key" ON "Workout"("mmrWorkoutId") WHERE "mmrWorkoutId" IS NOT NULL;
