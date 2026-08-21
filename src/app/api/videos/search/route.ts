import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { videoSearchSchema } from '@/lib/validation';
import { apiPaginated, apiError } from '@/lib/api-response';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const params = Object.fromEntries(searchParams);

  const parsed = videoSearchSchema.safeParse(params);
  if (!parsed.success) {
    return apiError('SEARCH_QUERY_REQUIRED', parsed.error.issues[0].message);
  }

  const { q, query, title, publisher, producer, genre, creator, sort, order, page, limit } = parsed.data;
  const searchTerm = q || query;

  const skip = (page - 1) * limit;

  // Build where clause
  const conditions: Record<string, unknown>[] = [{ status: 'READY' }];

  if (searchTerm) {
    const cleanSearch = searchTerm.trim().replace(/^@/, '');
    conditions.push({
      OR: [
        { title: { contains: searchTerm } },
        { publisher: { contains: searchTerm } },
        { producer: { contains: searchTerm } },
        { description: { contains: searchTerm } },
        { creator: { creatorName: { contains: searchTerm } } },
        { creator: { user: { username: { contains: cleanSearch } } } },
        { creator: { user: { displayName: { contains: searchTerm } } } },
      ],
    });
  }

  if (title) {
    conditions.push({ title: { contains: title } });
  }
  if (publisher) {
    conditions.push({ publisher: { contains: publisher } });
  }
  if (producer) {
    conditions.push({ producer: { contains: producer } });
  }
  if (genre) {
    conditions.push({ genre });
  }
  if (creator) {
    const cleanCreator = creator.trim().replace(/^@/, '');
    conditions.push({
      OR: [
        { creator: { creatorName: { contains: creator } } },
        { creator: { user: { username: { contains: cleanCreator } } } },
        { creator: { user: { displayName: { contains: creator } } } },
      ],
    });
  }

  const where = { AND: conditions };

  // Build orderBy
  let orderBy: Record<string, string> = { createdAt: order };
  if (sort === 'viewCount') {
    orderBy = { viewCount: order };
  }

  try {
    const [videos, total] = await Promise.all([
      db.video.findMany({
        where,
        include: {
          creator: {
            select: {
              id: true,
              creatorName: true,
              user: {
                select: {
                  id: true,
                  username: true,
                  displayName: true,
                  avatarUrl: true,
                },
              },
            },
          },
        },
        orderBy,
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
  } catch {
    return apiError('INTERNAL_SERVER_ERROR');
  }
}
