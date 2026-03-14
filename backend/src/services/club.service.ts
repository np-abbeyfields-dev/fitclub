import crypto from 'crypto';
import prisma from '../config/database';
import { sendClubInviteEmail } from './email.service';
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

  /** Club member. Returns club with inviteCode only when caller is admin (for inviting). */
  static async getClub(clubId: string, userId: string) {
    const m = await this.ensureMember(userId, clubId);
    const club = await prisma.club.findUniqueOrThrow({
      where: { id: clubId },
      select: { id: true, name: true, createdAt: true, inviteCode: true },
    });
    const { inviteCode, ...rest } = club;
    return { ...rest, role: m.role, ...(m.role === 'admin' ? { inviteCode } : {}) };
  }

  /** Admin only. Update club name. */
  static async updateClub(clubId: string, userId: string, data: { name?: string }) {
    await this.ensureMember(userId, clubId, 'admin');
    const name = data.name?.trim();
    if (!name) throw new ValidationError('Club name is required.');
    return prisma.club.update({
      where: { id: clubId },
      data: { name },
      select: { id: true, name: true, createdAt: true },
    });
  }

  /** Roles are derived from ClubMembership only; never stored on User. */
  static async ensureMember(userId: string, clubId: string, requireRole?: 'admin' | 'team_lead' | 'member') {
    const m = await prisma.clubMembership.findUnique({
      where: { userId_clubId: { userId, clubId } },
    });
    if (!m) throw new AuthorizationError('You are not a member of this club.');
    if (requireRole === 'admin' && m.role !== 'admin') throw new AuthorizationError('Admin access required.');
    if (requireRole === 'team_lead' && m.role !== 'admin' && m.role !== 'team_lead')
      throw new AuthorizationError('Team lead or admin access required.');
    return m;
  }

  /** Admin only. Set another member's role (promote/demote). Assign team leads. */
  static async setMemberRole(clubId: string, adminUserId: string, targetUserId: string, newRole: 'admin' | 'team_lead' | 'member') {
    await this.ensureMember(adminUserId, clubId, 'admin');
    const target = await prisma.clubMembership.findUnique({
      where: { userId_clubId: { userId: targetUserId, clubId } },
    });
    if (!target) throw new NotFoundError('Member not found in this club.');
    if (target.role === 'admin' && newRole !== 'admin') {
      const adminCount = await prisma.clubMembership.count({ where: { clubId, role: 'admin' } });
      if (adminCount <= 1) throw new ValidationError('Club must have at least one admin. Promote another member to admin first.');
    }
    if (newRole === 'team_lead') {
      const round =
        (await prisma.round.findFirst({
          where: { clubId, status: 'active' },
          select: { id: true },
        })) ??
        (await prisma.round.findFirst({
          where: { clubId, status: 'draft' },
          select: { id: true },
        }));
      if (round) {
        const inTeam = await prisma.teamMembership.findUnique({
          where: { userId_roundId: { userId: targetUserId, roundId: round.id } },
        });
        if (!inTeam) {
          throw new ValidationError(
            'User must be in a team to be assigned Team Lead. Add them to a team in the current round first.'
          );
        }
      }
    }
    const updated = await prisma.clubMembership.update({
      where: { userId_clubId: { userId: targetUserId, clubId } },
      data: { role: newRole },
      include: { User: { select: { id: true, email: true, displayName: true } } },
    });
    return updated;
  }

  /** Any club member. List members with role; optionally include active-round team assignment. */
  static async listMembers(clubId: string, userId: string, options?: { search?: string; activeRoundId?: string }) {
    await this.ensureMember(userId, clubId);
    const q = options?.search?.trim();
    const memberships = await prisma.clubMembership.findMany({
      where: {
        clubId,
        ...(q
          ? {
              User: {
                OR: [
                  { displayName: { contains: q, mode: 'insensitive' } },
                  { email: { contains: q, mode: 'insensitive' } },
                ],
              },
            }
          : {}),
      },
      include: {
        User: { select: { id: true, email: true, displayName: true } },
      },
      orderBy: { joinedAt: 'asc' },
    });
    let teamByUserId: Map<string, { teamId: string; teamName: string }> = new Map();
    if (options?.activeRoundId) {
      const teamMembers = await prisma.teamMembership.findMany({
        where: { roundId: options.activeRoundId },
        include: { Team: { select: { id: true, name: true } } },
      });
      teamMembers.forEach((tm) => teamByUserId.set(tm.userId, { teamId: tm.Team.id, teamName: tm.Team.name }));
    }
    return memberships.map((m) => ({
      id: m.id,
      userId: m.userId,
      role: m.role,
      joinedAt: m.joinedAt,
      displayName: m.User.displayName,
      email: m.User.email,
      team: options?.activeRoundId ? teamByUserId.get(m.userId) ?? null : undefined,
    }));
  }

  /** Admin only. Remove a member from the club. Cannot remove last admin. */
  static async removeMember(clubId: string, adminUserId: string, targetUserId: string) {
    await this.ensureMember(adminUserId, clubId, 'admin');
    const target = await prisma.clubMembership.findUnique({
      where: { userId_clubId: { userId: targetUserId, clubId } },
    });
    if (!target) throw new NotFoundError('Member not found in this club.');
    const adminCount = await prisma.clubMembership.count({
      where: { clubId, role: 'admin' as const },
    });
    if (target.role === 'admin' && adminCount <= 1) {
      throw new ValidationError('Cannot remove the last admin.');
    }
    await prisma.clubMembership.delete({
      where: { userId_clubId: { userId: targetUserId, clubId } },
    });
    return { success: true };
  }

  /** Any club member. Send an invite email to the given address. Does not expose inviteCode in response. */
  static async sendInviteByEmail(clubId: string, userId: string, email: string): Promise<{ sent: boolean; error?: string }> {
    const trimmed = email?.trim()?.toLowerCase();
    if (!trimmed) throw new ValidationError('Email is required.');
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmed)) throw new ValidationError('Please enter a valid email address.');
    await this.ensureMember(userId, clubId);
    const club = await prisma.club.findUnique({
      where: { id: clubId },
      select: { name: true, inviteCode: true },
    });
    if (!club) throw new NotFoundError('Club not found.');
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { displayName: true },
    });
    const inviterDisplayName = user?.displayName?.trim() || 'A club member';
    const result = await sendClubInviteEmail({
      toEmail: trimmed,
      clubName: club.name,
      inviteCode: club.inviteCode,
      inviterDisplayName,
    });
    return result;
  }
}
