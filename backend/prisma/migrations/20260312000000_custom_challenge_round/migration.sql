-- Add round_id to custom_challenge (challenge belongs to one round; round has many challenges)
-- Step 1: add column as nullable for backfill
ALTER TABLE "custom_challenge" ADD COLUMN "round_id" TEXT;

-- Step 2: backfill: assign each challenge to the most recent round of its club (by startDate)
UPDATE "custom_challenge" cc
SET "round_id" = (
  SELECT r.id FROM "Round" r
  WHERE r."clubId" = cc.club_id
  ORDER BY r."startDate" DESC
  LIMIT 1
)
WHERE cc."round_id" IS NULL;

-- Step 3: drop challenges that have no round (club has no rounds) so we can set NOT NULL
DELETE FROM "custom_challenge" WHERE "round_id" IS NULL;

-- Step 4: make round_id required
ALTER TABLE "custom_challenge" ALTER COLUMN "round_id" SET NOT NULL;

-- Step 5: add FK and index
CREATE INDEX "custom_challenge_round_id_idx" ON "custom_challenge"("round_id");
ALTER TABLE "custom_challenge" ADD CONSTRAINT "custom_challenge_round_id_fkey" FOREIGN KEY ("round_id") REFERENCES "Round"("id") ON DELETE CASCADE ON UPDATE CASCADE;
