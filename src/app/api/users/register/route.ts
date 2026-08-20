import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { hashPassword } from '@/lib/auth';
import { registerSchema } from '@/lib/validation';
import { apiCreated, apiError } from '@/lib/api-response';
import { logger } from '@/lib/logger';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      return apiError('VALIDATION_ERROR', parsed.error.issues[0].message);
    }

    const { email, displayName, password } = parsed.data;

    const existing = await db.user.findUnique({ where: { email } });
    if (existing) {
      return apiError('EMAIL_EXISTS');
    }

    const hashedPassword = await hashPassword(password);
    const user = await db.user.create({
      data: {
        email,
        displayName,
        password: hashedPassword,
        role: 'CONSUMER',
      },
    });

    logger.info('User registered', { userId: user.id, email: user.email });

    return apiCreated({
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      role: user.role,
    });
  } catch (error) {
    logger.error('Registration failed', { error: (error as Error).message });
    return apiError('INTERNAL_SERVER_ERROR');
  }
}
