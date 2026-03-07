import request from 'supertest';
import app from '../src/app';
import { registerUser, createClub, createRound, activateRound, authHeader } from './helpers';

describe('Rounds', () => {
  let token: string;
  let clubId: string;

  beforeAll(async () => {
    const { token: t } = await registerUser(app);
    token = t;
    const club = await createClub(app, token);
    clubId = club.id;
  });

  describe('POST /api/clubs/:clubId/rounds', () => {
    it('creates a round (admin)', async () => {
      const start = new Date();
      const end = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      const res = await request(app)
        .post(`/api/clubs/${clubId}/rounds`)
        .set(authHeader(token))
        .send({
          name: 'Test Round',
          startDate: start.toISOString(),
          endDate: end.toISOString(),
          scoringConfig: { scoring_mode: 'hybrid', daily_cap_points: 20, activity_rules: [] },
        });
      expect(res.status).toBe(201);
      expect(res.body.data).toMatchObject({ name: 'Test Round', status: 'draft' });
      expect(res.body.data).toHaveProperty('id');
    });

    it('rejects missing scoringConfig', async () => {
      const start = new Date();
      const end = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      const res = await request(app)
        .post(`/api/clubs/${clubId}/rounds`)
        .set(authHeader(token))
        .send({
          name: 'No Config Round',
          startDate: start.toISOString(),
          endDate: end.toISOString(),
        });
      expect(res.status).toBe(400);
    });

    it('rejects endDate before startDate', async () => {
      const start = new Date();
      const end = new Date(Date.now() - 86400000);
      const res = await request(app)
        .post(`/api/clubs/${clubId}/rounds`)
        .set(authHeader(token))
        .send({
          name: 'Bad Dates',
          startDate: start.toISOString(),
          endDate: end.toISOString(),
          scoringConfig: {},
        });
      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/clubs/:clubId/rounds', () => {
    it('lists rounds for club', async () => {
      const res = await request(app)
        .get(`/api/clubs/${clubId}/rounds`)
        .set(authHeader(token));
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  describe('POST /api/rounds/:roundId/activate', () => {
    it('activates a draft round', async () => {
      const round = await createRound(app, token, clubId, { name: 'Activate Me' });
      const res = await request(app)
        .post(`/api/rounds/${round.id}/activate`)
        .set(authHeader(token));
      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('active');
    });
  });

  describe('GET /api/rounds/:roundId', () => {
    it('returns round by id', async () => {
      const round = await createRound(app, token, clubId, { name: 'Get Round' });
      const res = await request(app)
        .get(`/api/rounds/${round.id}`)
        .set(authHeader(token));
      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(round.id);
      expect(res.body.data).toHaveProperty('name');
    });
  });

  describe('GET /api/rounds/:roundId/leaderboard', () => {
    it('returns leaderboard (teams or individuals)', async () => {
      const round = await createRound(app, token, clubId, { name: 'LB Round' });
      await activateRound(app, token, round.id);
      const res = await request(app)
        .get(`/api/rounds/${round.id}/leaderboard?type=teams`)
        .set(authHeader(token));
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });
});
