import request from 'supertest';
import app from '../src/app';
import {
  registerUser,
  createClub,
  createRound,
  activateRound,
  createTeam,
  authHeader,
} from './helpers';

describe('Teams', () => {
  let token: string;
  let userId: string;
  let roundId: string;

  beforeAll(async () => {
    const { token: t, user } = await registerUser(app);
    token = t;
    userId = user.id;
    const club = await createClub(app, token);
    const round = await createRound(app, token, club.id, { name: 'Teams Round' });
    await activateRound(app, token, round.id);
    roundId = round.id;
  });

  describe('POST /api/rounds/:roundId/teams', () => {
    it('creates a team', async () => {
      const res = await request(app)
        .post(`/api/rounds/${roundId}/teams`)
        .set(authHeader(token))
        .send({ name: 'Team Alpha' });
      expect(res.status).toBe(201);
      expect(res.body.data).toMatchObject({ name: 'Team Alpha' });
      expect(res.body.data).toHaveProperty('id');
      expect(res.body.data.roundId).toBe(roundId);
    });
  });

  describe('GET /api/rounds/:roundId/teams', () => {
    it('lists teams for round', async () => {
      await createTeam(app, token, roundId, 'List Teams A');
      const res = await request(app)
        .get(`/api/rounds/${roundId}/teams`)
        .set(authHeader(token));
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('GET /api/rounds/:roundId/my-team', () => {
    it('returns my team when in one', async () => {
      const team = await createTeam(app, token, roundId, 'My Team Check');
      await request(app)
        .post(`/api/rounds/${roundId}/teams/${team.id}/members`)
        .set(authHeader(token))
        .send({ userId });
      const res = await request(app)
        .get(`/api/rounds/${roundId}/my-team`)
        .set(authHeader(token));
      expect(res.status).toBe(200);
      expect(res.body.data).toHaveProperty('name', 'My Team Check');
      expect(res.body.data).toHaveProperty('members');
      expect(Array.isArray(res.body.data.members)).toBe(true);
    });
  });
});
