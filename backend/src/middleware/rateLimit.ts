import rateLimit from 'express-rate-limit';
import { Response } from 'express';
import { env } from '../config/env';

const jsonHandler = (msg: string) => (_req: any, res: Response) => {
  res.status(429).json({ success: false, error: msg });
};

export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: env.nodeEnv === 'production' ? 250 : 1000,
  message: 'Too many requests',
  standardHeaders: true,
  legacyHeaders: false,
  handler: jsonHandler('Too many requests from this IP, please try again later.'),
  skip: (req) => {
    if (env.nodeEnv === 'test') return true;
    if (req.method === 'OPTIONS') return true;
    if (req.path === '/api/health' || req.path === '/health') return true;
    if (req.path.startsWith('/api/auth/')) return true;
    return false;
  },
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: env.nodeEnv === 'production' ? 20 : 1000,
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  handler: jsonHandler('Too many login attempts. Please try again later.'),
  skip: () => env.nodeEnv === 'test' || env.nodeEnv === 'development',
});
