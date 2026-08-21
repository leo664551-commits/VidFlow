import { NextRequest } from 'next/server';
import { getSession } from '@/lib/auth';
import { db } from '@/lib/db';
import { apiCreated, apiError, apiSuccess } from '@/lib/api-response';
import { z } from 'zod';

const applySchema = z.object({
  category: z.string().min(1, 'Please select a content category').max(50),
  description: z.string().max(500).optional().nullable(),
  socialLink: z.string().max(200).optional().nullable(),
});

export async function POST(request: NextRequest) {
  const user = await getSession(request);
  if (!user) return apiError('UNAUTHORIZED', 'Please log in to apply as a creator');

  if (user.role === 'CREATOR') {
    return apiSuccess({
      success: true,
      message: 'You already have an active Creator account',
      role: 'CREATOR',
      status: 'APPROVED',
    });
  }

  try {
    const body = await request.json();
    const parsed = applySchema.safeParse(body);
    if (!parsed.success) {
      return apiError('VALIDATION_ERROR', parsed.error.issues[0].message);
    }

    const { category, description, socialLink } = parsed.data;

    // Check if there is already a pending application
    const existingPending = await db.creatorApplication.findFirst({
      where: {
        userId: user.id,
        status: 'PENDING',
      },
    });

    if (existingPending) {
      return apiSuccess({
        success: true,
        message: 'You already have a pending creator application under review',
        status: 'PENDING',
        applicationId: existingPending.id,
      });
    }

    // Create Creator Application with PENDING status (Admin review required)
    const application = await db.creatorApplication.create({
      data: {
        userId: user.id,
        category,
        description: description || null,
        socialLink: socialLink || null,
        status: 'PENDING',
      },
    });

    return apiCreated({
      success: true,
      message: 'Application submitted! Your application is under review by platform administrators.',
      status: 'PENDING',
      applicationId: application.id,
    });
  } catch (error) {
    console.error('Error processing creator application:', error);
    return apiError('INTERNAL_SERVER_ERROR');
  }
}
