import { NextRequest } from 'next/server';
import { getSession } from '@/lib/auth';
import { db } from '@/lib/db';
import { getContainer } from '@/lib/cosmos';
import { apiSuccess, apiError } from '@/lib/api-response';
import { createAuditLog } from '@/services/audit';
import { createNotification } from '@/services/notification';
import { v4 as uuidv4 } from 'uuid';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSession(request);
  if (!user) return apiError('UNAUTHORIZED');
  if (user.role !== 'ADMIN') return apiError('FORBIDDEN');

  const { id } = await params;

  try {
    const container = getContainer('creatorApplications');
    if (container) {
      const body = await request.json();
      const { status, reason } = body;

      if (status !== 'APPROVED' && status !== 'REJECTED') {
        return apiError('VALIDATION_ERROR', 'Status must be APPROVED or REJECTED');
      }

      const { resources } = await container.items.query({
        query: 'SELECT * FROM c WHERE c.id = @id',
        parameters: [{ name: '@id', value: id }]
      }).fetchAll();
      
      const application = resources[0];
      if (!application) return apiError('NOT_FOUND', 'Creator application not found');

      const usersContainer = getContainer('users');
      if (!usersContainer) return apiError('INTERNAL_SERVER_ERROR');

      const { resources: userResources } = await usersContainer.items.query({
        query: 'SELECT * FROM c WHERE c.id = @userId',
        parameters: [{ name: '@userId', value: application.userId }]
      }).fetchAll();
      const applicant = userResources[0];

      // Update application
      const item = container.item(id, application.userId);
      const { resource: appResource } = await item.read();
      await item.replace({
        ...appResource,
        status,
        reviewedAt: new Date().toISOString(),
        reviewedBy: user.id,
        updatedAt: new Date().toISOString()
      });

      if (status === 'APPROVED' && applicant) {
        const userItem = usersContainer.item(applicant.id, applicant.id);
        const { resource: uResource } = await userItem.read();
        await userItem.replace({
          ...uResource,
          role: 'CREATOR',
          category: application.category,
          updatedAt: new Date().toISOString()
        });

        const creatorProfilesContainer = getContainer('creatorProfiles');
        if (creatorProfilesContainer) {
          const { resources: profiles } = await creatorProfilesContainer.items.query({
            query: 'SELECT * FROM c WHERE c.userId = @userId',
            parameters: [{ name: '@userId', value: application.userId }]
          }).fetchAll();

          const creatorName = applicant.displayName || applicant.username || 'Creator';
          if (profiles.length > 0) {
            const profile = profiles[0];
            const pItem = creatorProfilesContainer.item(profile.id, profile.userId);
            const { resource: pResource } = await pItem.read();
            await pItem.replace({
              ...pResource,
              creatorName,
              description: application.description || applicant.bio || '',
              category: application.category,
              updatedAt: new Date().toISOString()
            });
          } else {
            await creatorProfilesContainer.items.create({
              id: uuidv4(),
              userId: application.userId,
              creatorName,
              description: application.description || applicant.bio || '',
              category: application.category,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            });
          }
        }
      }

      await createAuditLog(
        user.id,
        status === 'APPROVED' ? 'CREATOR_APPLICATION_APPROVED' : 'CREATOR_APPLICATION_REJECTED',
        'CreatorApplication',
        id,
        { applicantUserId: application.userId, status, reason: reason || undefined }
      );

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

    } else {
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
    }
  } catch (error) {
    console.error('Error reviewing creator application:', error);
    return apiError('INTERNAL_SERVER_ERROR');
  }
}
