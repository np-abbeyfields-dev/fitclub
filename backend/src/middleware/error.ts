import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errors';
import { logError } from '../utils/logger';
import { env } from '../config/env';

export const errorHandler = (
  err: Error | AppError,
  req: Request,
  res: Response,
  _next: NextFunction
) => {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({ success: false, error: err.message });
  }
  logError(err, { path: req.path, method: req.method });
  const message = env.nodeEnv === 'production' ? 'Internal server error' : err.message;
  return res.status(500).json({
    success: false,
    error: message,
    ...(env.nodeEnv === 'development' && { stack: err.stack }),
  });
};
