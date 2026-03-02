import { env } from '../config/env';

function log(level: string, message: string, meta?: object) {
  const payload = { timestamp: new Date().toISOString(), level, message, ...meta };
  if (env.nodeEnv === 'production') {
    console.log(JSON.stringify(payload));
  } else {
    console.log(`[${payload.level}] ${payload.message}`, meta || '');
  }
}

export function logError(err: Error, meta?: object) {
  log('error', err.message, { ...meta, stack: err.stack });
}

export function logRequest(req: { method: string; path: string }, res: { statusCode: number }, responseTimeMs: number) {
  log('info', `${req.method} ${req.path} ${res.statusCode} ${responseTimeMs}ms`, { responseTimeMs });
}
