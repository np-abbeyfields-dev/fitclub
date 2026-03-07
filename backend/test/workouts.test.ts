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

describe('Workouts', () => {
  let token: string;
  let roundId: string;

  beforeAll(async () => {
    const { token: t } = await registerUser(app);
    token = t;
    const club = await createClub(app, token);
    const round = await createRound(app, token, club.id, { name: 'Workouts Round' });
    await activateRound(app, token, round.id);
    roundId = round.id;
    await createTeam(app, token, roundId, 'Workout Team');
  });

  describe('GET /api/workouts/activities', () => {
    it('returns activity list', async () => {
      const res = await request(app)
        .get('/api/workouts/activities')
        .set(authHeader(token));
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  describe('GET /api/workouts/workout-master', () => {
    it('returns workout master list', async () => {
      const res = await request(app)
        .get('/api/workouts/workout-master')
        .set(authHeader(token));
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  describe('POST /api/rounds/:roundId/workouts', () => {
    it('logs a workout with duration', async () => {
      const res = await request(app)
        .post(`/api/rounds/${roundId}/workouts`)
        .set(authHeader(token))
        .send({
          activityType: 'Gym Workout',
          durationMinutes: 30,
        });
      expect(res.status).toBe(201);
      expect(res.body.data).toHaveProperty('id');
      expect(res.body.data).toHaveProperty('points');
      expect(typeof res.body.data.points).toBe('number');
    });

    it('logs a workout with distance', async () => {
      const res = await request(app)
        .post(`/api/rounds/${roundId}/workouts`)
        .set(authHeader(token))
        .send({
          activityType: 'Run',
          distanceKm: 5,
        });
      expect(res.status).toBe(201);
      expect(res.body.data.points).toBeGreaterThan(0);
    });

    it('rejects unknown activity type', async () => {
      const res = await request(app)
        .post(`/api/rounds/${roundId}/workouts`)
        .set(authHeader(token))
        .send({
          activityType: 'UnknownActivityXYZ',
          durationMinutes: 10,
        });
      expect(res.status).toBe(400);
    });

    it('rejects no duration or distance', async () => {
      const res = await request(app)
        .post(`/api/rounds/${roundId}/workouts`)
        .set(authHeader(token))
        .send({ activityType: 'Run' });
      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/workouts/me', () => {
    it('returns my workouts', async () => {
      const res = await request(app)
        .get('/api/workouts/me')
        .set(authHeader(token));
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });
});
