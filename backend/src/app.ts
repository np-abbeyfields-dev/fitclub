import 'express-async-errors';
import express from 'express';
import cors from 'cors';
import { env } from './config/env';
import { errorHandler } from './middleware/error';
import { apiLimiter } from './middleware/rateLimit';
import { requestLogger } from './middleware/requestLogger';
import { securityHeaders, enforceHTTPS } from './middleware/security';

import authRoutes from './routes/auth.routes';
import clubRoutes from './routes/club.routes';
import roundRoutes from './routes/round.routes';
import teamRoutes from './routes/team.routes';
import userRoutes from './routes/user.routes';
import workoutRoutes from './routes/workout.routes';
import notificationRoutes from './routes/notification.routes';

const app = express();

app.set('trust proxy', 1);
app.use(securityHeaders);
if (env.nodeEnv === 'production') app.use(enforceHTTPS);
app.use(requestLogger);

const corsOptions = {
  origin: (origin: string | undefined, cb: (err: Error | null, allow?: boolean) => void) => {
    if (!origin) return cb(null, true);
    const allowed = env.corsOrigin === '*' ? true : env.corsOrigin.split(',').map((o) => o.trim()).includes(origin);
    if (allowed) return cb(null, true);
    cb(new Error('Not allowed by CORS'));
  },
  credentials: true,
};
app.use(cors(corsOptions));
app.use('/api', apiLimiter);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/api/health', async (_req, res) => {
  let database = false;
  try {
    const prisma = (await import('./config/database')).default;
    await prisma.$queryRaw`SELECT 1`;
    database = true;
  } catch (err) {
    database = false;
    // Log so Cloud Run logs show the real DB error (e.g. auth, socket, encoding)
    console.error('[health] Database check failed:', err instanceof Error ? err.message : err);
  }
  res.json({
    success: true,
    message: 'FitClub API',
    timestamp: new Date().toISOString(),
    environment: env.nodeEnv,
    database,
  });
});

app.get('/health', async (_req, res) => {
  let database = false;
  try {
    const prisma = (await import('./config/database')).default;
    await prisma.$queryRaw`SELECT 1`;
    database = true;
  } catch (err) {
    database = false;
    console.error('[health] Database check failed:', err instanceof Error ? err.message : err);
  }
  res.status(database ? 200 : 503).json({ status: database ? 'healthy' : 'degraded', database });
});

app.use('/api/auth', authRoutes);
app.use('/api', roundRoutes);
app.use('/api/clubs', clubRoutes);
app.use('/api', teamRoutes);
app.use('/api', userRoutes);
app.use('/api', workoutRoutes);
app.use('/api', notificationRoutes);

app.use(errorHandler);

const PORT = env.port;
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[FitClub] Server on port ${PORT} | Env: ${env.nodeEnv}`);
  });
}

export default app;
