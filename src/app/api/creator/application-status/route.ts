import { NextRequest } from 'next/server';
import { getSession } from '@/lib/auth';
import { db } from '@/lib/db';
import { apiSuccess, apiError } from '@/lib/api-response';

export async function GET(request: NextRequest) {
  const user = await getSession(request);
  if (!user) return apiError('UNAUTHORIZED');

  try {
    const latestApplication = await db.creatorApplication.findFirst({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
    });

    if (!latestApplication) {
      return apiSuccess({
        hasApplication: false,
        application: null,
      });
    }

    return apiSuccess({
      hasApplication: true,
      application: {
        id: latestApplication.id,
        category: latestApplication.category,
        description: latestApplication.description,
        socialLink: latestApplication.socialLink,
        status: latestApplication.status,
        createdAt: latestApplication.createdAt.toISOString(),
        reviewedAt: latestApplication.reviewedAt ? latestApplication.reviewedAt.toISOString() : null,
      },
    });
  } catch (error) {
    console.error('Error fetching application status:', error);
    return apiError('INTERNAL_SERVER_ERROR');
  }
}
