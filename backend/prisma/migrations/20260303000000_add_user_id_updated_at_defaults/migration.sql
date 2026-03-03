-- Add DEFAULT for User.id and User.updatedAt so raw INSERTs (e.g. sample data) can omit them.
-- Prisma schema has @default(uuid()) and @updatedAt; init migration did not set DB defaults.

ALTER TABLE "User" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();
ALTER TABLE "User" ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;
