import { NextRequest } from 'next/server';
import { getSession } from '@/lib/auth';
import { db } from '@/lib/db';
import { apiSuccess, apiError } from '@/lib/api-response';
import { createAuditLog } from '@/services/audit';
import { createNotification } from '@/services/notification';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSession(request);
  if (!user) return apiError('UNAUTHORIZED');
  if (user.role !== 'ADMIN') return apiError('FORBIDDEN');

  const { id } = await params;

  try {
    const body = await request.json();
    const { status, reason } = body;

    if (status !== 'APPROVED' && status !== 'REJECTED') {
      return apiError('VALIDATION_ERROR', 'Status must be APPROVED or REJECTED');
    }

    const application = await db.creatorApplication.findUnique({
      where: { id },
      include: { user: true },
    });

    if (!application) {
      return apiError('NOT_FOUND', 'Creator application not found');
    }

    await db.$transaction(async (tx) => {
      // 1. Update application status
      await tx.creatorApplication.update({
        where: { id },
        data: {
          status,
          reviewedAt: new Date(),
          reviewedBy: user.id,
        },
      });

      // 2. If approved, promote user and create CreatorProfile
      if (status === 'APPROVED') {
        await tx.user.update({
          where: { id: application.userId },
          data: {
            role: 'CREATOR',
            category: application.category,
          },
        });

        const creatorName =
          application.user.displayName || application.user.username || 'Creator';

        await tx.creatorProfile.upsert({
          where: { userId: application.userId },
          update: {
            creatorName,
            description: application.description || application.user.bio || '',
            category: application.category,
          },
          create: {
            userId: application.userId,
            creatorName,
            description: application.description || application.user.bio || '',
            category: application.category,
          },
        });
      }
    });

    await createAuditLog(
      user.id,
      status === 'APPROVED' ? 'CREATOR_APPLICATION_APPROVED' : 'CREATOR_APPLICATION_REJECTED',
      'CreatorApplication',
      id,
      { applicantUserId: application.userId, status, reason: reason || undefined }
    );

    // Notify applicant of review decision
    try {
      await createNotification({
        userId: application.userId,
        actorId: user.id,
        type: status === 'APPROVED' ? 'CREATOR_APPLICATION_APPROVED' : 'CREATOR_APPLICATION_REJECTED',
        title: status === 'APPROVED' ? 'Creator Application Approved! 🎉' : 'Creator Application Update',
        message:
          status === 'APPROVED'
            ? 'Congratulations! Your creator application has been approved. Welcome to VidFlow Creator Studio!'
            : `Your creator application was not approved${reason ? `: ${reason}` : '. You may reapply with updated channel details.'}`,
        entityType: 'User',
        entityId: application.userId,
      });
    } catch (notifErr) {
      console.error('Failed to notify applicant:', notifErr);
    }

    return apiSuccess({
      success: true,
      message: status === 'APPROVED' ? 'Creator application approved' : 'Creator application rejected',
      status,
      applicationId: id,
    });
  } catch (error) {
    console.error('Error reviewing creator application:', error);
    return apiError('INTERNAL_SERVER_ERROR');
  }
}
