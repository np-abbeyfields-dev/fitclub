import request from 'supertest';
import app from '../src/app';
import { registerUser, createClub, authHeader } from './helpers';

describe('Clubs', () => {
  let token: string;
  let userId: string;

  beforeAll(async () => {
    const { token: t, user } = await registerUser(app);
    token = t;
    userId = user.id;
  });

  describe('POST /api/clubs', () => {
    it('creates a club and returns it with inviteCode', async () => {
      const res = await request(app)
        .post('/api/clubs')
        .set(authHeader(token))
        .send({ name: 'My Test Club' });
      expect(res.status).toBe(201);
      expect(res.body.data).toMatchObject({ name: 'My Test Club' });
      expect(res.body.data).toHaveProperty('id');
      expect(res.body.data).toHaveProperty('inviteCode');
      expect(res.body.data.inviteCode).toMatch(/^[A-Z0-9]+$/);
    });

    it('rejects missing name', async () => {
      const res = await request(app)
        .post('/api/clubs')
        .set(authHeader(token))
        .send({});
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/name/i);
    });

    it('rejects unauthenticated request', async () => {
      const res = await request(app).post('/api/clubs').send({ name: 'Club' });
      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/clubs', () => {
    it('lists my clubs', async () => {
      await createClub(app, token, 'List Test Club');
      const res = await request(app).get('/api/clubs').set(authHeader(token));
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
      const found = res.body.data.find((c: { name: string }) => c.name === 'List Test Club');
      expect(found).toBeDefined();
      expect(found).toHaveProperty('role');
    });

    it('rejects without token', async () => {
      const res = await request(app).get('/api/clubs');
      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/clubs/:clubId', () => {
    it('returns club by id for member', async () => {
      const club = await createClub(app, token, 'Get By Id Club');
      const res = await request(app)
        .get(`/api/clubs/${club.id}`)
        .set(authHeader(token));
      expect(res.status).toBe(200);
      expect(res.body.data).toMatchObject({ id: club.id, name: 'Get By Id Club' });
      expect(res.body.data).toHaveProperty('role');
    });

    it('returns 403 for non-member', async () => {
      const { token: otherToken } = await registerUser(app);
      const club = await createClub(app, token, 'Other User Club');
      const res = await request(app)
        .get(`/api/clubs/${club.id}`)
        .set(authHeader(otherToken));
      expect(res.status).toBe(403);
    });
  });

  describe('POST /api/clubs/join', () => {
    it('joins club with valid invite code', async () => {
      const club = await createClub(app, token, 'Join Test Club');
      const { token: joinerToken } = await registerUser(app);
      const res = await request(app)
        .post('/api/clubs/join')
        .set(authHeader(joinerToken))
        .send({ inviteCode: club.inviteCode });
      expect(res.status).toBe(201);
      expect(res.body.data).toHaveProperty('clubId', club.id);
    });

    it('rejects invalid invite code', async () => {
      const res = await request(app)
        .post('/api/clubs/join')
        .set(authHeader(token))
        .send({ inviteCode: 'INVALID' });
      expect(res.status).toBe(404);
    });

    it('rejects already member', async () => {
      const club = await createClub(app, token, 'Already Member Club');
      const res = await request(app)
        .post('/api/clubs/join')
        .set(authHeader(token))
        .send({ inviteCode: club.inviteCode });
      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/clubs/:clubId/dashboard', () => {
    it('returns dashboard for member', async () => {
      const club = await createClub(app, token, 'Dashboard Club');
      const res = await request(app)
        .get(`/api/clubs/${club.id}/dashboard`)
        .set(authHeader(token));
      expect(res.status).toBe(200);
      expect(res.body.data).toHaveProperty('activeRound');
      expect(res.body.data).toHaveProperty('dailyCap');
      expect(res.body.data).toHaveProperty('topTeams');
    });
  });

  describe('GET /api/clubs/:clubId/members', () => {
    it('lists members', async () => {
      const club = await createClub(app, token, 'Members List Club');
      const res = await request(app)
        .get(`/api/clubs/${club.id}/members`)
        .set(authHeader(token));
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.some((m: { userId: string }) => m.userId === userId)).toBe(true);
    });
  });
});
