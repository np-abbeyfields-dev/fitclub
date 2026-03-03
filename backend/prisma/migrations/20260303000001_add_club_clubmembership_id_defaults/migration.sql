-- Add DEFAULT for Club and ClubMembership id (and Club.updatedAt) so raw INSERTs can omit them.
-- Prisma schema has @default(uuid()); init migration did not set DB defaults.

ALTER TABLE "Club" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();
ALTER TABLE "Club" ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "ClubMembership" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();
