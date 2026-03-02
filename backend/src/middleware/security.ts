import { Request, Response, NextFunction } from 'express';
import { env } from '../config/env';

export const securityHeaders = (_req: Request, res: Response, next: NextFunction) => {
  if (env.nodeEnv === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubdomains; preload');
  }
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
};

export const enforceHTTPS = (req: Request, res: Response, next: NextFunction) => {
  if (env.nodeEnv === 'production') {
    const proto = req.headers['x-forwarded-proto'];
    if (proto && proto !== 'https') {
      return res.redirect(301, `https://${req.headers.host}${req.url}`);
    }
  }
  next();
};
