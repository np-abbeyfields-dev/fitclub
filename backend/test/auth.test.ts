import request from 'supertest';
import app from '../src/app';
import { registerUser, unique } from './helpers';

describe('Auth', () => {
  describe('POST /api/auth/register', () => {
    it('registers a new user and returns user + token', async () => {
      const email = `${unique()}@fitclub.test`;
      const res = await request(app)
        .post('/api/auth/register')
        .send({ email, password: 'TestPass123!', displayName: 'Test User' });
      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toMatchObject({
        user: { email, displayName: 'Test User' },
      });
      expect(res.body.data.user).toHaveProperty('id');
      expect(res.body.data).toHaveProperty('token');
      expect(typeof res.body.data.token).toBe('string');
    });

    it('rejects missing email', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ password: 'TestPass123!', displayName: 'Test' });
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toMatch(/email|required/i);
    });

    it('rejects missing password', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ email: 'a@b.com', displayName: 'Test' });
      expect(res.status).toBe(400);
    });

    it('rejects missing displayName', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ email: 'a@b.com', password: 'TestPass123!' });
      expect(res.status).toBe(400);
    });

    it('rejects duplicate email', async () => {
      const email = `${unique()}@fitclub.test`;
      await request(app)
        .post('/api/auth/register')
        .send({ email, password: 'TestPass123!', displayName: 'First' });
      const res = await request(app)
        .post('/api/auth/register')
        .send({ email, password: 'OtherPass1!', displayName: 'Second' });
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/already registered|email/i);
    });
  });

  describe('POST /api/auth/login', () => {
    it('logs in with valid credentials', async () => {
      const { email, password } = await registerUser(app);
      const res = await request(app).post('/api/auth/login').send({ email, password });
      expect(res.status).toBe(200);
      expect(res.body.data.user.email).toBe(email);
      expect(res.body.data).toHaveProperty('token');
    });

    it('rejects wrong password', async () => {
      const { email } = await registerUser(app);
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email, password: 'WrongPass123!' });
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('rejects unknown email', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'nonexistent@fitclub.test', password: 'TestPass123!' });
      expect(res.status).toBe(401);
    });

    it('rejects missing email or password', async () => {
      const res1 = await request(app).post('/api/auth/login').send({ password: 'TestPass123!' });
      const res2 = await request(app).post('/api/auth/login').send({ email: 'a@b.com' });
      expect(res1.status).toBe(400);
      expect(res2.status).toBe(400);
    });
  });
});
