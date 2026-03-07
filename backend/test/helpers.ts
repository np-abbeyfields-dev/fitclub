import request from 'supertest';
import type { Express } from 'express';

const unique = () => `test-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

export async function registerUser(app: Express, overrides?: { email?: string; password?: string; displayName?: string }) {
  const email = overrides?.email ?? `${unique()}@fitclub.test`;
  const password = overrides?.password ?? 'TestPass123!';
  const displayName = overrides?.displayName ?? 'Test User';
  const res = await request(app)
    .post('/api/auth/register')
    .send({ email, password, displayName });
  if (res.status !== 201) throw new Error(`Register failed: ${res.status} ${JSON.stringify(res.body)}`);
  const token = (res.body?.data?.token) as string;
  const user = res.body?.data?.user as { id: string; email: string; displayName: string };
  return { user, token, email, password, displayName };
}

export async function loginUser(app: Express, email: string, password: string) {
  const res = await request(app).post('/api/auth/login').send({ email, password });
  if (res.status !== 200) throw new Error(`Login failed: ${res.status} ${JSON.stringify(res.body)}`);
  return res.body?.data?.token as string;
}

export function authHeader(token: string) {
  return { Authorization: `Bearer ${token}` };
}

export async function createClub(app: Express, token: string, name?: string) {
  const clubName = name ?? `Club ${unique()}`;
  const res = await request(app)
    .post('/api/clubs')
    .set(authHeader(token))
    .send({ name: clubName });
  if (res.status !== 201) throw new Error(`Create club failed: ${res.status} ${JSON.stringify(res.body)}`);
  return res.body?.data as { id: string; name: string; inviteCode?: string; role: string };
}

export async function createRound(
  app: Express,
  token: string,
  clubId: string,
  overrides?: { name?: string; startDate?: Date; endDate?: Date }
) {
  const start = overrides?.startDate ?? new Date();
  const end = overrides?.endDate ?? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  const name = overrides?.name ?? `Round ${unique()}`;
  const res = await request(app)
    .post(`/api/clubs/${clubId}/rounds`)
    .set(authHeader(token))
    .send({
      name,
      startDate: start.toISOString(),
      endDate: end.toISOString(),
      scoringConfig: {
        scoring_mode: 'hybrid',
        daily_cap_points: 20,
        per_workout_cap_points: 10,
        dailyCap: 20,
        activity_rules: [],
      },
    });
  if (res.status !== 201) throw new Error(`Create round failed: ${res.status} ${JSON.stringify(res.body)}`);
  return res.body?.data as { id: string; name: string; status: string; clubId: string };
}

export async function activateRound(app: Express, token: string, roundId: string) {
  const res = await request(app)
    .post(`/api/rounds/${roundId}/activate`)
    .set(authHeader(token));
  if (res.status !== 200) throw new Error(`Activate round failed: ${res.status} ${JSON.stringify(res.body)}`);
  return res.body?.data;
}

export async function createTeam(app: Express, token: string, roundId: string, name?: string) {
  const teamName = name ?? `Team ${unique()}`;
  const res = await request(app)
    .post(`/api/rounds/${roundId}/teams`)
    .set(authHeader(token))
    .send({ name: teamName });
  if (res.status !== 201) throw new Error(`Create team failed: ${res.status} ${JSON.stringify(res.body)}`);
  return res.body?.data as { id: string; name: string; roundId: string };
}

export { unique };
