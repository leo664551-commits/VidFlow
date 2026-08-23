import { PrismaClient } from '@prisma/client';
import { hash } from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('--- Initializing VidFlow Demo Accounts Seeder ---');

  const adminPass = await hash('AdminPass123!', 12);
  const creatorPass = await hash('CreatorPass123!', 12);
  const consumerPass = await hash('UserPass123!', 12);

  // 1. Admin Account
  const admin = await prisma.user.upsert({
    where: { email: 'admin@vidflow.com' },
    update: {
      role: 'ADMIN',
      status: 'ACTIVE',
      displayName: 'System Administrator',
      username: 'admin',
      password: adminPass,
    },
    create: {
      email: 'admin@vidflow.com',
      displayName: 'System Administrator',
      username: 'admin',
      password: adminPass,
      role: 'ADMIN',
      status: 'ACTIVE',
    },
  });
  console.log(`✓ Admin: admin@vidflow.com / AdminPass123!`);

  // 2. Creator Account
  const creator = await prisma.user.upsert({
    where: { email: 'creator@vidflow.com' },
    update: {
      role: 'CREATOR',
      status: 'ACTIVE',
      displayName: 'Alex Rivers',
      username: 'alexrivers',
      password: creatorPass,
      bio: 'Creating comedy and lifestyle short-form videos on VidFlow.',
      category: 'Comedy',
    },
    create: {
      email: 'creator@vidflow.com',
      displayName: 'Alex Rivers',
      username: 'alexrivers',
      password: creatorPass,
      role: 'CREATOR',
      status: 'ACTIVE',
      bio: 'Creating comedy and lifestyle short-form videos on VidFlow.',
      category: 'Comedy',
    },
  });

  await prisma.creatorProfile.upsert({
    where: { userId: creator.id },
    update: {
      creatorName: 'Alex Rivers',
      description: 'Creating comedy and lifestyle short-form videos on VidFlow.',
      category: 'Comedy',
    },
    create: {
      userId: creator.id,
      creatorName: 'Alex Rivers',
      description: 'Creating comedy and lifestyle short-form videos on VidFlow.',
      category: 'Comedy',
    },
  });
  console.log(`✓ Creator: creator@vidflow.com / CreatorPass123!`);

  // 3. Consumer Account
  const consumer = await prisma.user.upsert({
    where: { email: 'user@vidflow.com' },
    update: {
      role: 'CONSUMER',
      status: 'ACTIVE',
      displayName: 'Sam Viewer',
      username: 'samviewer',
      password: consumerPass,
    },
    create: {
      email: 'user@vidflow.com',
      displayName: 'Sam Viewer',
      username: 'samviewer',
      password: consumerPass,
      role: 'CONSUMER',
      status: 'ACTIVE',
    },
  });
  console.log(`✓ Consumer: user@vidflow.com / UserPass123!`);

  console.log('--- All demo accounts ready ---');
}

main()
  .catch((e) => {
    console.error('Database provisioning error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
