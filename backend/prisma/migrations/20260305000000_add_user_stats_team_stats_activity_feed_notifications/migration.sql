-- CreateTable: UserStats (FITCLUB_MASTER_SPEC §5.10)
CREATE TABLE "user_stats" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "clubId" TEXT NOT NULL,
    "roundId" TEXT NOT NULL,
    "totalPoints" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalWorkouts" INTEGER NOT NULL DEFAULT 0,
    "totalCalories" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "streakDays" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_stats_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "user_stats_userId_clubId_roundId_key" ON "user_stats"("userId", "clubId", "roundId");
CREATE INDEX "user_stats_userId_idx" ON "user_stats"("userId");
CREATE INDEX "user_stats_roundId_idx" ON "user_stats"("roundId");
CREATE INDEX "user_stats_clubId_idx" ON "user_stats"("clubId");

-- CreateTable: TeamStats (FITCLUB_MASTER_SPEC §5.11)
CREATE TABLE "team_stats" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "clubId" TEXT NOT NULL,
    "roundId" TEXT NOT NULL,
    "totalPoints" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalWorkouts" INTEGER NOT NULL DEFAULT 0,
    "memberCount" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "team_stats_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "team_stats_teamId_roundId_key" ON "team_stats"("teamId", "roundId");
CREATE INDEX "team_stats_teamId_idx" ON "team_stats"("teamId");
CREATE INDEX "team_stats_roundId_idx" ON "team_stats"("roundId");
CREATE INDEX "team_stats_clubId_idx" ON "team_stats"("clubId");

-- CreateTable: ActivityFeed (FITCLUB_MASTER_SPEC §5.12)
CREATE TABLE "activity_feed" (
    "id" TEXT NOT NULL,
    "clubId" TEXT NOT NULL,
    "actorUserId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "metadataJson" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activity_feed_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "activity_feed_clubId_idx" ON "activity_feed"("clubId");
CREATE INDEX "activity_feed_createdAt_idx" ON "activity_feed"("createdAt");

-- CreateTable: Notification (FITCLUB_MASTER_SPEC §5.13)
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "clubId" TEXT,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "notifications_userId_idx" ON "notifications"("userId");
CREATE INDEX "notifications_isRead_idx" ON "notifications"("isRead");
