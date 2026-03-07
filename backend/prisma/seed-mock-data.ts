/**
 * Mock data seed for testing.
 * Prerequisites: User 023a49a2-ee34-42a4-886f-999cfb457923 and clubs 1, 2, 3 must exist.
 * This script does NOT create that user or the three clubs.
 *
 * From backend folder:
 *   npm run seed:mock
 * Or:
 *   npx ts-node prisma/seed-mock-data.ts
 *
 * Set env CLUB_1_ID, CLUB_2_ID, CLUB_3_ID if your club IDs are UUIDs (defaults: "1", "2", "3").
 */

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const YOUR_USER_ID = '023a49a2-ee34-42a4-886f-999cfb457923';
const CLUB_IDS = [
  process.env.CLUB_1_ID ?? '1',
  process.env.CLUB_2_ID ?? '2',
  process.env.CLUB_3_ID ?? '3',
];

const DEFAULT_SCORING_CONFIG = {
  scoring_mode: 'hybrid',
  daily_cap_points: 20,
  per_workout_cap_points: 10,
  dailyCap: 20,
  activity_rules: [
    { activity_type: 'Running', metric_type: 'distance', conversion_ratio: 5, minimum_threshold: 0.5, max_per_workout: 10 },
    { activity_type: 'Walking', metric_type: 'distance', conversion_ratio: 3, minimum_threshold: 0.5, max_per_workout: 6 },
    { activity_type: 'Gym(Strength Training)', metric_type: 'duration', conversion_ratio: 0.2, minimum_threshold: 5, max_per_workout: 8 },
  ],
};

async function main() {
  const testPasswordHash = await bcrypt.hash('Test123!', 10);

  const mockUsers = [
    { id: 'a1000001-0000-4000-8000-000000000001', email: 'alice@fitclub.test', displayName: 'Alice Runner', passwordHash: testPasswordHash },
    { id: 'a1000002-0000-4000-8000-000000000002', email: 'bob@fitclub.test', displayName: 'Bob Cyclist', passwordHash: testPasswordHash },
    { id: 'a1000003-0000-4000-8000-000000000003', email: 'carol@fitclub.test', displayName: 'Carol Swimmer', passwordHash: testPasswordHash },
    { id: 'a1000004-0000-4000-8000-000000000004', email: 'dave@fitclub.test', displayName: 'Dave Lifter', passwordHash: testPasswordHash },
    { id: 'a1000005-0000-4000-8000-000000000005', email: 'eve@fitclub.test', displayName: 'Eve Walker', passwordHash: testPasswordHash },
    { id: 'a1000006-0000-4000-8000-000000000006', email: 'frank@fitclub.test', displayName: 'Frank Yoga', passwordHash: testPasswordHash },
  ];

  console.log('Upserting mock users...');
  for (const u of mockUsers) {
    await prisma.user.upsert({
      where: { id: u.id },
      create: u,
      update: { displayName: u.displayName, passwordHash: u.passwordHash },
    });
  }

  console.log('Upserting club memberships (your user + mock users)...');
  const memberships: { userId: string; clubId: string; role: 'admin' | 'member' | 'team_lead' }[] = [
    { userId: YOUR_USER_ID, clubId: CLUB_IDS[0], role: 'admin' },
    { userId: YOUR_USER_ID, clubId: CLUB_IDS[1], role: 'member' },
    { userId: YOUR_USER_ID, clubId: CLUB_IDS[2], role: 'member' },
    { userId: mockUsers[0].id, clubId: CLUB_IDS[0], role: 'member' },
    { userId: mockUsers[1].id, clubId: CLUB_IDS[0], role: 'member' },
    { userId: mockUsers[2].id, clubId: CLUB_IDS[0], role: 'team_lead' },
    { userId: mockUsers[3].id, clubId: CLUB_IDS[0], role: 'member' },
    { userId: mockUsers[0].id, clubId: CLUB_IDS[1], role: 'member' },
    { userId: mockUsers[1].id, clubId: CLUB_IDS[1], role: 'member' },
    { userId: mockUsers[4].id, clubId: CLUB_IDS[1], role: 'member' },
    { userId: mockUsers[2].id, clubId: CLUB_IDS[2], role: 'member' },
    { userId: mockUsers[5].id, clubId: CLUB_IDS[2], role: 'member' },
  ];
  for (const m of memberships) {
    await prisma.clubMembership.upsert({
      where: { userId_clubId: { userId: m.userId, clubId: m.clubId } },
      create: m,
      update: { role: m.role },
    });
  }

  const now = new Date();
  const roundStart = new Date(now);
  roundStart.setDate(roundStart.getDate() - 14);
  const roundEnd = new Date(now);
  roundEnd.setDate(roundEnd.getDate() + 30);

  console.log('Creating rounds (one active per club)...');
  const roundIds: string[] = [];
  for (let i = 0; i < CLUB_IDS.length; i++) {
    let r = await prisma.round.findFirst({
      where: { clubId: CLUB_IDS[i], status: 'active' },
    });
    if (!r) {
      r = await prisma.round.create({
        data: {
          clubId: CLUB_IDS[i],
          name: `Round ${i + 1} – Spring Challenge`,
          startDate: roundStart,
          endDate: roundEnd,
          scoringConfig: DEFAULT_SCORING_CONFIG as object,
          teamSize: 4,
          status: 'active',
        },
      });
    }
    roundIds.push(r.id);
  }

  const workoutMasters = await prisma.workoutMaster.findMany({ take: 10 });
  const byType = (t: string) => workoutMasters.find((m) => m.workoutType === t);
  const runMaster = byType('Run') ?? workoutMasters[0];
  const walkMaster = byType('Walk') ?? workoutMasters[0];
  const gymMaster = byType('Gym Workout') ?? workoutMasters[0];
  if (!runMaster) {
    console.warn('No WorkoutMaster rows found. Run "npm run seed" first. Skipping workouts.');
  }
  const activityTypes = [
    { type: 'Run', duration: null as number | null, distance: 5, master: runMaster },
    { type: 'Walk', duration: null, distance: 3, master: walkMaster },
    { type: 'Gym Workout', duration: 45, distance: null, master: gymMaster },
  ].filter((a) => a.master);

  const allUserIds = [YOUR_USER_ID, ...mockUsers.map((u) => u.id)];

  console.log('Creating teams and team memberships...');
  for (let r = 0; r < roundIds.length; r++) {
    const roundId = roundIds[r];
    const clubId = CLUB_IDS[r];
    let teamA = await prisma.team.findFirst({ where: { roundId, name: { contains: 'Alpha' } } });
    if (!teamA) {
      teamA = await prisma.team.create({
        data: { roundId, name: `Club ${clubId} – Team Alpha`, createdBy: YOUR_USER_ID },
      });
    }
    let teamB = await prisma.team.findFirst({ where: { roundId, name: { contains: 'Bravo' } } });
    if (!teamB) {
      teamB = await prisma.team.create({
        data: { roundId, name: `Club ${clubId} – Team Bravo`, createdBy: mockUsers[0].id },
      });
    }

    const assign: { userId: string; teamId: string }[] = [
      { userId: YOUR_USER_ID, teamId: teamA.id },
      { userId: mockUsers[0].id, teamId: teamA.id },
      { userId: mockUsers[1].id, teamId: teamA.id },
      { userId: mockUsers[2].id, teamId: teamB.id },
      { userId: mockUsers[3].id, teamId: teamB.id },
    ];
    const extraUsers = allUserIds.filter((id) => !assign.some((a) => a.userId === id));
    extraUsers.forEach((userId, i) => assign.push({ userId, teamId: [teamA.id, teamB.id][i % 2] }));

    for (const a of assign) {
      await prisma.teamMembership.upsert({
        where: { userId_roundId: { userId: a.userId, roundId } },
        create: { userId: a.userId, teamId: a.teamId, roundId, isLeader: a.teamId === teamA.id && a.userId === YOUR_USER_ID },
        update: { teamId: a.teamId },
      });
    }
  }

  console.log('Creating workouts and score ledger entries...');
  const roundsToSeedWorkouts = await Promise.all(
    roundIds.map(async (id) => {
      const count = await prisma.workout.count({ where: { roundId: id } });
      return count === 0 ? id : null;
    }),
  ).then((arr) => arr.filter((id): id is string => id !== null));
  let workoutCount = 0;
  for (let dayOffset = -12; dayOffset <= 2; dayOffset++) {
    const loggedAt = new Date(now);
    loggedAt.setDate(loggedAt.getDate() + dayOffset);
    loggedAt.setHours(10, 0, 0, 0);

    for (let r = 0; r < roundsToSeedWorkouts.length; r++) {
      const roundId = roundsToSeedWorkouts[r];
      const participants = allUserIds.slice(0, 4 + (r % 3));
      if (activityTypes.length === 0) continue;
      for (let u = 0; u < participants.length; u++) {
        const userId = participants[u];
        const idx = ((dayOffset + u) % activityTypes.length + activityTypes.length) % activityTypes.length;
        const act = activityTypes[idx];
        const durationMinutes = act.duration;
        const distanceKm = act.distance;
        const rawPoints = distanceKm != null && distanceKm > 0
          ? Math.round(distanceKm * 5 * 10) / 10
          : durationMinutes != null && durationMinutes > 0
            ? Math.round(durationMinutes * 0.2 * 10) / 10
            : 5;
        const capped = Math.min(rawPoints, 10);
        const finalPoints = Math.min(capped, 20);

        const workout = await prisma.workout.create({
          data: {
            userId,
            roundId,
            activityType: act.type,
            workoutMasterId: act.master.id,
            durationMinutes: durationMinutes ?? undefined,
            distanceKm: distanceKm ?? undefined,
            loggedAt,
          },
        });
        const membership = await prisma.teamMembership.findUnique({
          where: { userId_roundId: { userId, roundId } },
          select: { teamId: true },
        });
        await prisma.scoreLedger.create({
          data: {
            workoutId: workout.id,
            userId,
            roundId,
            teamId: membership?.teamId ?? null,
            reasonType: 'workout',
            rawPoints,
            cappedPoints: capped,
            dailyAdjustedPoints: finalPoints,
            finalAwardedPoints: finalPoints,
            ruleSnapshotJson: JSON.stringify({ dailyCap: 20, source: 'workout' }),
          },
        });
        workoutCount++;
      }
    }
  }

  console.log('Upserting UserStats and TeamStats...');
  for (const roundId of roundIds) {
    const round = await prisma.round.findUnique({ where: { id: roundId } });
    if (!round) continue;
    const clubId = round.clubId;
    const userSums = await prisma.scoreLedger.groupBy({
      by: ['userId'],
      where: { roundId, reasonType: 'workout' },
      _sum: { finalAwardedPoints: true },
      _count: { id: true },
    });
    for (const s of userSums) {
      await prisma.userStats.upsert({
        where: { userId_clubId_roundId: { userId: s.userId, clubId, roundId } },
        create: {
          userId: s.userId,
          clubId,
          roundId,
          totalPoints: s._sum.finalAwardedPoints ?? 0,
          totalWorkouts: s._count.id,
          totalCalories: (s._count.id * 45) * 6,
          streakDays: Math.min(s._count.id, 7),
          updatedAt: now,
        },
        update: {
          totalPoints: s._sum.finalAwardedPoints ?? 0,
          totalWorkouts: s._count.id,
          updatedAt: now,
        },
      });
    }
    const teamSums = await prisma.scoreLedger.groupBy({
      by: ['teamId'],
      where: { roundId, reasonType: 'workout', teamId: { not: null } },
      _sum: { finalAwardedPoints: true },
      _count: { id: true },
    });
    const memberCounts = await prisma.teamMembership.groupBy({
      by: ['teamId'],
      where: { roundId },
      _count: { id: true },
    });
    const countByTeam = Object.fromEntries(memberCounts.map((m) => [m.teamId, m._count.id]));
    for (const t of teamSums) {
      if (!t.teamId) continue;
      await prisma.teamStats.upsert({
        where: { teamId_roundId: { teamId: t.teamId, roundId } },
        create: {
          teamId: t.teamId,
          clubId,
          roundId,
          totalPoints: t._sum.finalAwardedPoints ?? 0,
          totalWorkouts: t._count.id,
          memberCount: countByTeam[t.teamId] ?? 0,
          updatedAt: now,
        },
        update: {
          totalPoints: t._sum.finalAwardedPoints ?? 0,
          totalWorkouts: t._count.id,
          memberCount: countByTeam[t.teamId] ?? 0,
          updatedAt: now,
        },
      });
    }
  }

  console.log('Creating activity feed and notifications...');
  for (const clubId of CLUB_IDS) {
    await prisma.activityFeed.createMany({
      data: [
        { clubId, actorUserId: YOUR_USER_ID, type: 'ROUND_STARTED', metadataJson: JSON.stringify({ roundName: 'Spring Challenge' }) },
        { clubId, actorUserId: mockUsers[0].id, type: 'WORKOUT_LOGGED', metadataJson: JSON.stringify({ activityType: 'Run', points: 8 }) },
        { clubId, actorUserId: mockUsers[1].id, type: 'TEAM_JOINED', metadataJson: JSON.stringify({ teamName: 'Team Alpha' }) },
      ],
      skipDuplicates: false,
    });
  }
  await prisma.notification.createMany({
    data: [
      { userId: YOUR_USER_ID, clubId: CLUB_IDS[0], type: 'round_start', title: 'Round started', body: 'Spring Challenge has begun.', isRead: false },
      { userId: YOUR_USER_ID, clubId: null, type: 'system', title: 'Welcome', body: 'You are an admin of one club and member of two others.', isRead: true },
      { userId: mockUsers[0].id, clubId: CLUB_IDS[0], type: 'workout_approved', title: 'Points added', body: 'Your run was counted for 8 points.', isRead: false },
    ],
    skipDuplicates: false,
  });

  console.log('Mock data seed completed.');
  console.log(`  Users: ${mockUsers.length} (plus your user ${YOUR_USER_ID})`);
  console.log(`  Clubs: ${CLUB_IDS.join(', ')}`);
  console.log(`  Rounds: ${roundIds.length}`);
  console.log(`  Workouts / ScoreLedger: ${workoutCount}`);
  console.log('  Mock logins: alice@fitclub.test … eve@fitclub.test, frank@fitclub.test — password: Test123!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
