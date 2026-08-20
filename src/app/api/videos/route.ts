import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { apiPaginated, apiError } from '@/lib/api-response';
import { paginationSchema } from '@/lib/validation';

export async function GET(request: NextRequest) {
  const user = await getSession(request);

  const { searchParams } = new URL(request.url);
  const genre = searchParams.get('genre') || undefined;

  const pagination = paginationSchema.parse(Object.fromEntries(searchParams));
  const { page, limit } = pagination;
  const skip = (page - 1) * limit;

  let where: Record<string, unknown> = {};

  if (user) {
    if (user.role === 'CONSUMER') {
      // Consumers see only READY videos
      where = { ...where, status: 'READY' };
    } else if (user.role === 'CREATOR') {
      // Creators see all their own videos + all READY videos from others
      // For simplicity: show all their own + all READY
      where = {
        OR: [
          { status: 'READY' },
          { creator: { userId: user.id } },
        ],
      };
    }
    // ADMIN: see all (no filter)
  } else {
    // Unauthenticated: only READY videos
    where = { ...where, status: 'READY' };
  }

  if (genre) {
    where = {
      ...where,
      genre,
    };
  }

  try {
    const [videos, total] = await Promise.all([
      db.video.findMany({
        where,
        include: {
          creator: {
            select: { id: true, creatorName: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      db.video.count({ where }),
    ]);

    return apiPaginated(
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
      })),
      page,
      limit,
      total
    );
  } catch (error) {
    return apiError('INTERNAL_SERVER_ERROR');
  }
}
