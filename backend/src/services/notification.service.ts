import prisma from '../config/database';

const EXPO_ACCESS_TOKEN = process.env.EXPO_ACCESS_TOKEN?.trim() || '';

/** Create in-app notification for one user (FITCLUB_MASTER_SPEC §5.13). */
export async function createInAppNotification(
  userId: string,
  type: string,
  title: string,
  body: string,
  clubId?: string
): Promise<void> {
  await prisma.notification.create({
    data: { userId, type, title, body, clubId: clubId ?? null },
  });
}

/** Create ROUND_STARTED in-app notifications for all club members. Call after round activation. */
export async function createRoundStartedNotifications(clubId: string, roundName: string): Promise<void> {
  const members = await prisma.clubMembership.findMany({
    where: { clubId },
    select: { userId: true },
  });
  const title = 'Challenge is live';
  const body = `🔥 ${roundName} is live!`;
  await prisma.notification.createMany({
    data: members.map((m) => ({
      userId: m.userId,
      clubId,
      type: 'ROUND_STARTED',
      title,
      body,
    })),
  });
}

/**
 * Notify all club members that a challenge (round) is live.
 * Sends push notification "🔥 [Challenge Name] is live!" to every member with a registered push token.
 * No-op if EXPO_ACCESS_TOKEN is not set or no tokens exist.
 */
export async function notifyChallengeLive(clubId: string, challengeName: string): Promise<void> {
  if (!EXPO_ACCESS_TOKEN) {
    console.info('[notification] EXPO_ACCESS_TOKEN not set; skipping challenge live push');
    return;
  }

  const members = await prisma.clubMembership.findMany({
    where: { clubId },
    select: { userId: true },
  });
  const userIds = members.map((m) => m.userId);
  if (userIds.length === 0) return;

  const tokens = await prisma.pushToken.findMany({
    where: { userId: { in: userIds } },
    select: { token: true },
  });
  const pushTokens = [...new Set(tokens.map((t) => t.token))];
  if (pushTokens.length === 0) {
    console.info('[notification] No push tokens for club members; skipping');
    return;
  }

  try {
    const Expo = (await import('expo-server-sdk')).default;
    const expo = new Expo({ accessToken: EXPO_ACCESS_TOKEN });

    const validTokens = pushTokens.filter((t) => Expo.isExpoPushToken(t));
    if (validTokens.length === 0) {
      console.warn('[notification] No valid Expo push tokens');
      return;
    }

    const title = 'Challenge is live';
    const body = `🔥 ${challengeName} is live!`;
    const messages = validTokens.map((to) => ({
      to,
      title,
      body,
      sound: 'default' as const,
      priority: 'high' as const,
    }));

    const chunks = expo.chunkPushNotifications(messages);
    for (const chunk of chunks) {
      const tickets = await expo.sendPushNotificationsAsync(chunk);
      for (let i = 0; i < tickets.length; i++) {
        const ticket = tickets[i];
        if (ticket && typeof ticket === 'object' && 'status' in ticket && ticket.status === 'error') {
          console.warn('[notification] Push error', (ticket as { message?: string }).message);
        }
      }
    }
    console.info('[notification] Challenge live push sent', clubId, validTokens.length);
  } catch (e) {
    console.error('[notification] Failed to send challenge live push', clubId, e instanceof Error ? e.message : e);
    // Do not throw; activation already succeeded. Push is best-effort.
  }
}
