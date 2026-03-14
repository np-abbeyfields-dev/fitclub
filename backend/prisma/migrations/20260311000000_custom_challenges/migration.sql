-- CreateTable
CREATE TABLE "custom_challenge" (
    "id" TEXT NOT NULL,
    "club_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "icon" TEXT,
    "points_awarded" INTEGER NOT NULL,
    "created_by_user_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "custom_challenge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "custom_challenge_completion" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "custom_challenge_id" TEXT NOT NULL,
    "round_id" TEXT NOT NULL,
    "completion_date" TEXT NOT NULL,
    "points_awarded" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "custom_challenge_completion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "custom_challenge_club_id_idx" ON "custom_challenge"("club_id");

-- CreateIndex
CREATE INDEX "custom_challenge_created_by_user_id_idx" ON "custom_challenge"("created_by_user_id");

-- CreateIndex
CREATE UNIQUE INDEX "custom_challenge_completion_custom_challenge_id_user_id_completion_date_key" ON "custom_challenge_completion"("custom_challenge_id", "user_id", "completion_date");

-- CreateIndex
CREATE INDEX "custom_challenge_completion_round_id_idx" ON "custom_challenge_completion"("round_id");

-- CreateIndex
CREATE INDEX "custom_challenge_completion_user_id_idx" ON "custom_challenge_completion"("user_id");

-- CreateIndex
CREATE INDEX "custom_challenge_completion_custom_challenge_id_idx" ON "custom_challenge_completion"("custom_challenge_id");

-- AddForeignKey
ALTER TABLE "custom_challenge" ADD CONSTRAINT "custom_challenge_club_id_fkey" FOREIGN KEY ("club_id") REFERENCES "Club"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "custom_challenge" ADD CONSTRAINT "custom_challenge_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "custom_challenge_completion" ADD CONSTRAINT "custom_challenge_completion_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "custom_challenge_completion" ADD CONSTRAINT "custom_challenge_completion_custom_challenge_id_fkey" FOREIGN KEY ("custom_challenge_id") REFERENCES "custom_challenge"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "custom_challenge_completion" ADD CONSTRAINT "custom_challenge_completion_round_id_fkey" FOREIGN KEY ("round_id") REFERENCES "Round"("id") ON DELETE CASCADE ON UPDATE CASCADE;
