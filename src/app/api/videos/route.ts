import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { getContainer } from '@/lib/cosmos';
import { getSession } from '@/lib/auth';
import { apiPaginated, apiError } from '@/lib/api-response';
import { paginationSchema } from '@/lib/validation';
import { getDownloadUrl } from '@/services/storage';

export async function GET(request: NextRequest) {
  const user = await getSession(request);

  const { searchParams } = new URL(request.url);
  const genre = searchParams.get('genre') || undefined;

  const pagination = paginationSchema.parse(Object.fromEntries(searchParams));
  const { page, limit } = pagination;
  const skip = (page - 1) * limit;

  try {
    const container = getContainer('videos');
    if (container) {
      let conditions: string[] = [];
      let parameters: { name: string; value: any }[] = [];

      if (user) {
        if (user.role === 'CONSUMER') {
          conditions.push('c.status = @status');
          parameters.push({ name: '@status', value: 'READY' });
        } else if (user.role === 'CREATOR') {
          conditions.push(`(c.status = 'READY' OR c.creatorId = @userId)`);
          parameters.push({ name: '@userId', value: user.id });
        }
      } else {
        conditions.push('c.status = @status');
        parameters.push({ name: '@status', value: 'READY' });
      }

      if (genre) {
        conditions.push('c.genre = @genre');
        parameters.push({ name: '@genre', value: genre });
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
      
      const querySpec = {
        query: `SELECT * FROM c ${whereClause} ORDER BY c.createdAt DESC OFFSET ${skip} LIMIT ${limit}`,
        parameters
      };

      const countSpec = {
        query: `SELECT VALUE COUNT(1) FROM c ${whereClause}`,
        parameters
      };

      const [{ resources: videos }, { resources: countResult }] = await Promise.all([
        container.items.query(querySpec).fetchAll(),
        container.items.query(countSpec).fetchAll(),
      ]);
      const total = countResult[0] || 0;

      return apiPaginated(
        videos.map((v: any) => ({
          id: v.id,
          title: v.title,
          publisher: v.publisher,
          producer: v.producer,
          genre: v.genre,
          ageRating: v.ageRating,
          description: v.description,
          storageBlobName: getDownloadUrl(v.storageBlobName),
          thumbnailBlobName: v.thumbnailBlobName ? getDownloadUrl(v.thumbnailBlobName) : null,
          duration: v.duration,
          status: v.status,
          viewCount: v.viewCount,
          createdAt: typeof v.createdAt === 'string' ? v.createdAt : v.createdAt?.toISOString(),
          updatedAt: typeof v.updatedAt === 'string' ? v.updatedAt : v.updatedAt?.toISOString(),
          creator: v.creator || { id: v.creatorId, creatorName: v.publisher || 'Creator' },
        })),
        page,
        limit,
        total
      );
    } else {
      let where: Record<string, unknown> = {};

      if (user) {
        if (user.role === 'CONSUMER') {
          where = { ...where, status: 'READY' };
        } else if (user.role === 'CREATOR') {
          where = {
            OR: [
              { status: 'READY' },
              { creator: { userId: user.id } },
            ],
          };
        }
      } else {
        where = { ...where, status: 'READY' };
      }

      if (genre) {
        where = {
          ...where,
          genre,
        };
      }

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
    }
  } catch (error) {
    return apiError('INTERNAL_SERVER_ERROR');
  }
}
