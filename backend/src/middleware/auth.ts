import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { AuthRequest, JWTPayload } from '../types';
import { AuthenticationError } from '../utils/errors';
import prisma from '../config/database';

export const authenticate = async (req: AuthRequest, _res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AuthenticationError('No token provided');
    }
    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, env.jwtSecret) as JWTPayload;
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, email: true, displayName: true },
    });
    if (!user) throw new AuthenticationError('User not found');
    req.user = user as any;
    next();
  } catch (e) {
    if (e instanceof jwt.JsonWebTokenError) return next(new AuthenticationError('Invalid token'));
    next(e);
  }
};
