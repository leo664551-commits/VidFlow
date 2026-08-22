import { PrismaClient } from '@prisma/client';
import { hash } from 'bcryptjs';

const prisma = new PrismaClient();

async function createAdmin() {
  const args = process.argv.slice(2);
  const email = args[0] || process.env.ADMIN_EMAIL;
  const password = args[1] || process.env.ADMIN_PASSWORD;
  const displayName = args[2] || process.env.ADMIN_NAME || 'Administrator';
  const username = args[3] || (email ? email.split('@')[0].toLowerCase().replace(/[^a-z0-9_]/g, '') : 'admin');

  if (!email || !password) {
    console.error('--------------------------------------------------------------------------------');
    console.error('Usage: npx tsx scripts/create-admin.ts <email> <password> [displayName] [username]');
    console.error('Example: npx tsx scripts/create-admin.ts admin@yourdomain.com "MySecurePassword123!" "Admin" "admin"');
    console.error('--------------------------------------------------------------------------------');
    process.exit(1);
  }

  if (password.length < 8) {
    console.error('Error: Password must be at least 8 characters long.');
    process.exit(1);
  }

  const hashedPassword = await hash(password, 12);

  const user = await prisma.user.upsert({
    where: { email },
    update: {
      displayName,
      username,
      password: hashedPassword,
      role: 'ADMIN',
      status: 'ACTIVE',
    },
    create: {
      email,
      displayName,
      username,
      password: hashedPassword,
      role: 'ADMIN',
      status: 'ACTIVE',
    },
  });

  console.log('--------------------------------------------------------------------------------');
  console.log(`✓ Success: Administrator account provisioned for ${user.email} (Role: ADMIN)`);
  console.log('--------------------------------------------------------------------------------');
}

createAdmin()
  .catch((e) => {
    console.error('Error creating admin:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
