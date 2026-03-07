-- Rename round status ended -> completed (FITCLUB_MASTER_SPEC §4.2)
ALTER TYPE "round_status" RENAME VALUE 'ended' TO 'completed';

-- Team.createdBy
ALTER TABLE "Team" ADD COLUMN IF NOT EXISTS "createdBy" TEXT;
CREATE INDEX IF NOT EXISTS "Team_createdBy_idx" ON "Team"("createdBy");
ALTER TABLE "Team" ADD CONSTRAINT "Team_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- TeamMembership.joinedAt, isLeader
ALTER TABLE "TeamMembership" ADD COLUMN IF NOT EXISTS "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "TeamMembership" ADD COLUMN IF NOT EXISTS "isLeader" BOOLEAN NOT NULL DEFAULT false;

-- Workout.notes, workoutMasterId
ALTER TABLE "Workout" ADD COLUMN IF NOT EXISTS "notes" TEXT;
ALTER TABLE "Workout" ADD COLUMN IF NOT EXISTS "workoutMasterId" INTEGER;
CREATE INDEX IF NOT EXISTS "Workout_workoutMasterId_idx" ON "Workout"("workoutMasterId");
ALTER TABLE "Workout" ADD CONSTRAINT "Workout_workoutMasterId_fkey" FOREIGN KEY ("workoutMasterId") REFERENCES "WorkoutMaster"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ScoreLedger.reasonType, teamId
ALTER TABLE "ScoreLedger" ADD COLUMN IF NOT EXISTS "teamId" TEXT;
ALTER TABLE "ScoreLedger" ADD COLUMN IF NOT EXISTS "reasonType" TEXT NOT NULL DEFAULT 'workout';
CREATE INDEX IF NOT EXISTS "ScoreLedger_teamId_idx" ON "ScoreLedger"("teamId");
ALTER TABLE "ScoreLedger" ADD CONSTRAINT "ScoreLedger_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;
