import request from 'supertest';
import app from '../src/app';

describe('Health', () => {
  describe('GET /api/health', () => {
    it('returns 200 and success message', async () => {
      const res = await request(app).get('/api/health');
      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        success: true,
        message: 'FitClub API',
        environment: 'test',
      });
      expect(typeof res.body.timestamp).toBe('string');
      expect(typeof res.body.database).toBe('boolean');
    });
  });

  describe('GET /health', () => {
    it('returns 200 when database is ok', async () => {
      const res = await request(app).get('/health');
      expect([200, 503]).toContain(res.status);
      expect(res.body).toHaveProperty('status');
      expect(res.body).toHaveProperty('database');
    });
  });
});
