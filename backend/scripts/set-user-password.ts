/**
 * One-off script to set a user's password (bcrypt hash).
 * Use when a user was created in the DB without going through register (e.g. seed, manual insert).
 *
 * Run from backend/: npx ts-node scripts/set-user-password.ts <email> <newPassword>
 * Example: npx ts-node scripts/set-user-password.ts user@example.com MyNewPassword123
 */

import bcrypt from 'bcrypt';
import prisma from '../src/config/database';

async function main() {
  const email = process.argv[2]?.trim();
  const newPassword = process.argv[3];

  if (!email || !newPassword) {
    console.error('Usage: npx ts-node scripts/set-user-password.ts <email> <newPassword>');
    process.exit(1);
  }

  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
  });

  if (!user) {
    console.error('User not found with email:', email);
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash },
  });

  console.log('Password updated for', user.email);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
