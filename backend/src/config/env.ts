/**
 * Environment configuration for FitClub API.
 * Production: use env vars (Cloud Run injects DATABASE_URL, JWT_SECRET, etc.)
 */
import dotenv from 'dotenv';

dotenv.config();

const rawNodeEnv = process.env.NODE_ENV?.trim().toLowerCase() || 'development';
const nodeEnv = ['development', 'production', 'test'].includes(rawNodeEnv)
  ? (rawNodeEnv as 'development' | 'production' | 'test')
  : 'development';

function getDatabaseUrl(): string {
  if (nodeEnv === 'production') {
    const url = process.env.DATABASE_URL?.trim();
    if (!url) throw new Error('[ENV] Production requires DATABASE_URL.');
    return url;
  }
  if (nodeEnv === 'development') {
    const url = process.env.DATABASE_URL_DEV?.trim() || process.env.DATABASE_URL?.trim();
    if (!url) throw new Error('[ENV] Development requires DATABASE_URL_DEV or DATABASE_URL.');
    return url;
  }
  return process.env.TEST_DATABASE_URL?.trim() || process.env.DATABASE_URL?.trim() || '';
}

const databaseUrl = getDatabaseUrl();

export const env = {
  nodeEnv,
  databaseUrl,
  port: parseInt(process.env.PORT || '8080', 10),
  jwtSecret: process.env.JWT_SECRET || 'fitclub-dev-secret-change-in-production',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '24h',
  corsOrigin: process.env.CORS_ORIGIN || '*',
  gcpProjectId: process.env.GCP_PROJECT_ID || 'fitclub-488901',
} as const;
