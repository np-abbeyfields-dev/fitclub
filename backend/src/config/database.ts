import { PrismaClient } from '@prisma/client';
import { env } from './env';

process.env.DATABASE_URL = env.databaseUrl;

// Cloud SQL Unix socket: ?host=/cloudsql/... — Prisma appends ":5432" to the path if it sees a port.
// Use localhost so URL parses; then force port to empty so the string has no :5432.
let databaseUrl = env.databaseUrl.trim();
const isSocket = databaseUrl.includes('?host=/cloudsql/') && databaseUrl.match(/@\/[^?]+/);

if (isSocket) {
  databaseUrl = databaseUrl.replace(/@\/([^?]+)/, '@localhost/$1');
}

try {
  const url = new URL(databaseUrl);
  url.searchParams.set('application_name', 'fitclub-api');
  if (isSocket) url.port = ''; // so Prisma doesn't get :5432 and append it to socket path
  databaseUrl = url.toString();
  // Fallback: Node may not clear port for postgresql scheme; strip :5432 so Prisma gets no port
  if (isSocket && databaseUrl.includes(':5432/')) {
    databaseUrl = databaseUrl.replace(':5432/', '/');
  }
} catch {
  // use as-is
}

const prisma = new PrismaClient({
  log: env.nodeEnv === 'development' ? ['query', 'error', 'warn'] : ['error'],
  datasources: { db: { url: databaseUrl } },
});

export default prisma;
