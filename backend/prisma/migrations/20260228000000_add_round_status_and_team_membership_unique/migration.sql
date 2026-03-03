-- CreateEnum
CREATE TYPE "round_status" AS ENUM ('draft', 'active', 'ended');

-- AlterTable: add status to Round with default 'draft'
ALTER TABLE "Round" ADD COLUMN "status" "round_status" NOT NULL DEFAULT 'draft';

-- CreateIndex: only one active round per club (enforced at DB level)
CREATE UNIQUE INDEX "Round_clubId_status_active_key" ON "Round"("clubId") WHERE "status" = 'active';

-- CreateIndex: Round(clubId, status) for list/filter queries
CREATE INDEX "Round_clubId_status_idx" ON "Round"("clubId", "status");

-- AddForeignKey: TeamMembership.roundId -> Round (referential integrity)
ALTER TABLE "TeamMembership" ADD CONSTRAINT "TeamMembership_roundId_fkey" FOREIGN KEY ("roundId") REFERENCES "Round"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateIndex: one team per user per round
CREATE UNIQUE INDEX "TeamMembership_userId_roundId_key" ON "TeamMembership"("userId", "roundId");
