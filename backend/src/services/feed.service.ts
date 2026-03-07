import prisma from '../config/database';
import { ClubService } from './club.service';

const DEFAULT_PAGE_SIZE = 30;
const MAX_PAGE_SIZE = 50;

export type FeedItemType =
  | 'WORKOUT_LOGGED'
  | 'STREAK_REACHED'
  | 'ROUND_STARTED'
  | 'TEAM_JOINED'
  | 'TEAM_CREATED'
  | 'MILESTONE_REACHED';

export type FeedItem = {
  id: string;
  type: FeedItemType;
  actorUserId: string;
  actorName: string;
  metadata: Record<string, unknown>;
  createdAt: string;
};

/**
 * GET /clubs/:clubId/feed — activity feed for club (FITCLUB_MASTER_SPEC §7.9).
 */
export async function getClubFeed(
  clubId: string,
  userId: string,
  options?: { before?: string; limit?: number }
) {
  await ClubService.ensureMember(userId, clubId);
  const limit = Math.min(
    options?.limit ?? DEFAULT_PAGE_SIZE,
    MAX_PAGE_SIZE
  );
  const cursor = options?.before ? { id: options.before } : undefined;

  const items = await prisma.activityFeed.findMany({
    where: { clubId },
    orderBy: { createdAt: 'desc' },
    take: limit + 1,
    ...(cursor ? { cursor, skip: 1 } : {}),
  });

  const actorIds = [...new Set(items.map((i) => i.actorUserId))];
  const users =
    actorIds.length > 0
      ? await prisma.user.findMany({
          where: { id: { in: actorIds } },
          select: { id: true, displayName: true },
        })
      : [];
  const userMap = new Map(users.map((u) => [u.id, u.displayName]));

  const hasMore = items.length > limit;
  const list = (hasMore ? items.slice(0, limit) : items) as typeof items;

  const feed: FeedItem[] = list.map((item) => ({
    id: item.id,
    type: item.type as FeedItemType,
    actorUserId: item.actorUserId,
    actorName: userMap.get(item.actorUserId) ?? 'Unknown',
    metadata: item.metadataJson ? (JSON.parse(item.metadataJson) as Record<string, unknown>) : {},
    createdAt: item.createdAt.toISOString(),
  }));

  return {
    items: feed,
    nextCursor: hasMore ? list[list.length - 1].id : null,
  };
}
