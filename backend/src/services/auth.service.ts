import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import prisma from '../config/database';
import { env } from '../config/env';
import { RegisterDto, LoginDto, AuthResponse, JWTPayload } from '../types';
import { AuthenticationError, ValidationError } from '../utils/errors';

export class AuthService {
  static generateToken(userId: string, email: string): string {
    // 24h in seconds; jsonwebtoken accepts number for expiresIn
    const expiresInSeconds = 24 * 60 * 60;
    return jwt.sign(
      { userId, email } as JWTPayload,
      env.jwtSecret,
      { expiresIn: expiresInSeconds }
    );
  }

  static async register(data: RegisterDto): Promise<AuthResponse> {
    const existing = await prisma.user.findUnique({
      where: { email: data.email.toLowerCase() },
    });
    if (existing) throw new ValidationError('This email is already registered.');

    const passwordHash = await bcrypt.hash(data.password, 10);
    const user = await prisma.user.create({
      data: {
        email: data.email.toLowerCase(),
        passwordHash,
        displayName: data.displayName,
      },
      select: { id: true, email: true, displayName: true },
    });

    const token = this.generateToken(user.id, user.email);
    return { user, token };
  }

  static async login(data: LoginDto): Promise<AuthResponse> {
    const user = await prisma.user.findUnique({
      where: { email: data.email.toLowerCase() },
    });
    if (!user || !user.passwordHash) throw new AuthenticationError('Invalid email or password.');

    const valid = await bcrypt.compare(data.password, user.passwordHash);
    if (!valid) throw new AuthenticationError('Invalid email or password.');

    const token = this.generateToken(user.id, user.email);
    return {
      user: { id: user.id, email: user.email, displayName: user.displayName },
      token,
    };
  }
}
