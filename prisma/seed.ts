import { PrismaClient } from '@prisma/client';
import { hash } from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('--- Initializing VidFlow Database Provisioner ---');

  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;
  const adminName = process.env.ADMIN_NAME || 'System Administrator';

  if (adminEmail && adminPassword) {
    const hashedPassword = await hash(adminPassword, 12);
    const username = adminEmail.split('@')[0].toLowerCase().replace(/[^a-z0-9_]/g, '');

    const admin = await prisma.user.upsert({
      where: { email: adminEmail },
      update: {
        role: 'ADMIN',
        status: 'ACTIVE',
        displayName: adminName,
        username,
        password: hashedPassword,
      },
      create: {
        email: adminEmail,
        displayName: adminName,
        username,
        password: hashedPassword,
        role: 'ADMIN',
        status: 'ACTIVE',
      },
    });

    console.log(`✓ Admin account successfully provisioned for: ${admin.email} (Role: ADMIN)`);
  } else {
    console.log('Notice: ADMIN_EMAIL and ADMIN_PASSWORD not provided in environment variables.');
    console.log('To create your personal admin account securely, run:');
    console.log('  npx tsx scripts/create-admin.ts <your-email> <your-password> [displayName]');
  }
}

main()
  .catch((e) => {
    console.error('Database provisioning error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
