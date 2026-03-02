import { Request, Response, NextFunction } from 'express';
import { logRequest } from '../utils/logger';
import { env } from '../config/env';

export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  const originalEnd = res.end;
  res.end = function (chunk?: any, encoding?: any) {
    const ms = Date.now() - start;
    if (env.nodeEnv !== 'production' || res.statusCode >= 400 || ['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
      logRequest(req, res, ms);
    }
    return originalEnd.call(this, chunk, encoding);
  };
  next();
};
