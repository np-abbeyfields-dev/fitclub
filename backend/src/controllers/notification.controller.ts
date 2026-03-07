import { Response } from 'express';
import prisma from '../config/database';
import { AuthRequest, ApiResponse } from '../types';

function param(req: AuthRequest, key: string): string | undefined {
  const v = req.params[key];
  return Array.isArray(v) ? v[0] : v;
}

/**
 * GET /notifications — list current user's notifications (FITCLUB_MASTER_SPEC §7.10).
 */
export async function listNotifications(req: AuthRequest, res: Response): Promise<void> {
  const userId = req.user!.id;
  const limit = Math.min(Number(req.query?.limit) || 50, 100);
  const unreadOnly = String(req.query?.unread ?? '') === 'true';
  const notifications = await prisma.notification.findMany({
    where: { userId, ...(unreadOnly ? { isRead: false } : {}) },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
  const data = notifications.map((n) => ({
    id: n.id,
    type: n.type,
    title: n.title,
    body: n.body,
    clubId: n.clubId,
    isRead: n.isRead,
    createdAt: n.createdAt.toISOString(),
  }));
  res.json({ success: true, data } as ApiResponse);
}

/**
 * POST /notifications/:id/read — mark notification as read (§7.10).
 */
export async function markNotificationRead(req: AuthRequest, res: Response): Promise<void> {
  const userId = req.user!.id;
  const id = param(req, 'id');
  if (!id) {
    res.status(400).json({ success: false, error: 'Notification ID required.' } as ApiResponse);
    return;
  }
  const notification = await prisma.notification.findFirst({
    where: { id, userId },
  });
  if (!notification) {
    res.status(404).json({ success: false, error: 'Notification not found.' } as ApiResponse);
    return;
  }
  await prisma.notification.update({
    where: { id },
    data: { isRead: true },
  });
  res.json({ success: true, message: 'Marked as read.' } as ApiResponse);
}
