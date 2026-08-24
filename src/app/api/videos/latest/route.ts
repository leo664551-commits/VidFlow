import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { getContainer } from '@/lib/cosmos';
import { apiSuccess, apiError } from '@/lib/api-response';

export async function GET(request: NextRequest) {
  try {
    const container = getContainer('videos');
    if (container) {
      const { resources: videos } = await container.items
        .query({
          query: 'SELECT * FROM c WHERE c.status = @status ORDER BY c.createdAt DESC OFFSET 0 LIMIT 10',
          parameters: [{ name: '@status', value: 'READY' }]
        })
        .fetchAll();

      return apiSuccess(
        videos.map((v: any) => ({
          id: v.id,
          title: v.title,
          publisher: v.publisher,
          producer: v.producer,
          genre: v.genre,
          ageRating: v.ageRating,
          description: v.description,
          storageBlobName: v.storageBlobName,
          thumbnailBlobName: v.thumbnailBlobName,
          duration: v.duration,
          status: v.status,
          viewCount: v.viewCount,
          createdAt: typeof v.createdAt === 'string' ? v.createdAt : v.createdAt?.toISOString(),
          updatedAt: typeof v.updatedAt === 'string' ? v.updatedAt : v.updatedAt?.toISOString(),
          creator: v.creator,
        }))
      );
    } else {
      const videos = await db.video.findMany({
        where: { status: 'READY' },
        include: {
          creator: {
            select: { id: true, creatorName: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
      });

      return apiSuccess(
        videos.map((v) => ({
          id: v.id,
          title: v.title,
          publisher: v.publisher,
          producer: v.producer,
          genre: v.genre,
          ageRating: v.ageRating,
          description: v.description,
          storageBlobName: v.storageBlobName,
          thumbnailBlobName: v.thumbnailBlobName,
          duration: v.duration,
          status: v.status,
          viewCount: v.viewCount,
          createdAt: v.createdAt.toISOString(),
          updatedAt: v.updatedAt.toISOString(),
          creator: v.creator,
        }))
      );
    }
  } catch (error) {
    return apiError('INTERNAL_SERVER_ERROR');
  }
}
