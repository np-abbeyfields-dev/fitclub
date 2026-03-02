import crypto from 'crypto';
import prisma from '../config/database';
import { ValidationError, AuthorizationError, NotFoundError } from '../utils/errors';

function generateInviteCode(): string {
  return crypto.randomBytes(4).toString('hex').toUpperCase();
}

export class ClubService {
  static async createClub(userId: string, name: string) {
    let inviteCode = generateInviteCode();
    let exists = await prisma.club.findUnique({ where: { inviteCode } });
    while (exists) {
      inviteCode = generateInviteCode();
      exists = await prisma.club.findUnique({ where: { inviteCode } });
    }

    const club = await prisma.club.create({
      data: {
        name,
        inviteCode,
        Memberships: {
          create: { userId, role: 'admin' },
        },
      },
      include: {
        Memberships: { include: { User: { select: { id: true, email: true, displayName: true } } } },
      },
    });
    return club;
  }

  static async joinByInviteCode(userId: string, inviteCode: string) {
    const code = inviteCode.trim().toUpperCase();
    const club = await prisma.club.findUnique({ where: { inviteCode: code } });
    if (!club) throw new NotFoundError('Club not found for this invite code.');

    const existing = await prisma.clubMembership.findUnique({
      where: { userId_clubId: { userId, clubId: club.id } },
    });
    if (existing) throw new ValidationError('You are already a member of this club.');

    const membership = await prisma.clubMembership.create({
      data: { userId, clubId: club.id, role: 'member' },
      include: { Club: true, User: { select: { id: true, email: true, displayName: true } } },
    });
    return membership;
  }

  static async listMyClubs(userId: string) {
    const memberships = await prisma.clubMembership.findMany({
      where: { userId },
      include: { Club: true },
      orderBy: { joinedAt: 'desc' },
    });
    return memberships.map((m) => ({ ...m.Club, role: m.role, joinedAt: m.joinedAt }));
  }

  static async ensureMember(userId: string, clubId: string, role?: 'admin' | 'member') {
    const m = await prisma.clubMembership.findUnique({
      where: { userId_clubId: { userId, clubId } },
    });
    if (!m) throw new AuthorizationError('You are not a member of this club.');
    if (role === 'admin' && m.role !== 'admin') throw new AuthorizationError('Admin access required.');
    return m;
  }
}
