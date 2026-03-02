import { Request } from 'express';

export interface RegisterDto {
  email: string;
  password: string;
  displayName: string;
}

export interface LoginDto {
  email: string;
  password: string;
}

export interface JWTPayload {
  userId: string;
  email: string;
  iat?: number;
  exp?: number;
}

export interface AuthResponse {
  user: { id: string; email: string; displayName: string };
  token: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface AuthRequest extends Request {
  user?: { id: string; email: string; displayName: string };
}
