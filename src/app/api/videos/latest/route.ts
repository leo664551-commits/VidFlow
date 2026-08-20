import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { apiSuccess, apiError } from '@/lib/api-response';

export async function GET(request: NextRequest) {
  try {
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
  } catch {
    return apiError('INTERNAL_SERVER_ERROR');
  }
}
