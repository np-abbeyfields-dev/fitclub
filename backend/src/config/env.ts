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
  /** Optional. When set, challenge-round-go-live notifications are sent to club members via Expo Push. */
  expoAccessToken: process.env.EXPO_ACCESS_TOKEN?.trim() || '',
  /** Optional. When set, POST /api/internal/activate-scheduled-rounds requires this value in Authorization: Bearer <CRON_SECRET>. */
  cronSecret: process.env.CRON_SECRET?.trim() || '',
  /** Resend API key for sending club-invite emails. Required for invite-by-email. */
  resendApiKey: process.env.RESEND_API_KEY?.trim() || '',
  /** From address for invite emails (e.g. FitClub <noreply@yourdomain.com>). Defaults to Resend onboarding for dev. */
  inviteFromEmail: process.env.INVITE_FROM_EMAIL?.trim() || 'FitClub <onboarding@resend.dev>',
  /** App URL for invite email body (e.g. https://fitclub.app). Optional. */
  inviteAppUrl: process.env.INVITE_APP_URL?.trim() || '',
  /** Where to send Report Bug and Contact Us emails. Required for feedback to work. */
  supportEmail: process.env.SUPPORT_EMAIL?.trim() || '',

  // ----- BETA_MMR: Temporary. Remove when replacing with Apple/Samsung Health or per-user MMR. -----
  /** MMR API key (header api-key). Required for MMR import cron. */
  mmrApiKey: process.env.MMR_API_KEY?.trim() || '',
  /** MMR Bearer token (Authorization header). Required for MMR import cron. */
  mmrBearerToken: process.env.MMR_BEARER_TOKEN?.trim() || '',
  /** JSON array: [{"email":"u@x.com","mmrUserId":"12345"},...]. FitClub user by email; MMR user ID for API. */
  mmrUserMapJson: process.env.MMR_USER_MAP?.trim() || '',
  /** Optional. Club ID for MMR import. If unset, first club with an active round is used. */
  mmrClubId: process.env.MMR_CLUB_ID?.trim() || '',
  /** Optional. Only import workouts from the last N days (default 90). */
  mmrImportDays: process.env.MMR_IMPORT_DAYS ? Math.max(1, parseInt(process.env.MMR_IMPORT_DAYS, 10)) : 90,
} as const;
