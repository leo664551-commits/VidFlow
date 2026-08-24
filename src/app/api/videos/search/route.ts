import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { getContainer } from '@/lib/cosmos';
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

  try {
    const container = getContainer('videos');
    if (container) {
      let conditions = ["c.status = 'READY'"];
      let parameters: any[] = [];
      let paramIndex = 0;

      if (searchTerm) {
        const cleanSearch = searchTerm.trim().replace(/^@/, '');
        const cleanTag = searchTerm.trim().replace(/^#/, '');
        conditions.push(`(CONTAINS(c.title, @param${paramIndex}) OR CONTAINS(c.title, @param${paramIndex+1}) OR CONTAINS(c.publisher, @param${paramIndex}) OR CONTAINS(c.producer, @param${paramIndex}) OR CONTAINS(c.description, @param${paramIndex}) OR CONTAINS(c.description, @param${paramIndex+1}) OR CONTAINS(c.description, @param${paramIndex+2}) OR CONTAINS(c.creator.creatorName, @param${paramIndex}) OR CONTAINS(c.creator.user.username, @param${paramIndex+3}) OR CONTAINS(c.creator.user.displayName, @param${paramIndex}))`);
        parameters.push({ name: `@param${paramIndex}`, value: searchTerm });
        parameters.push({ name: `@param${paramIndex+1}`, value: cleanTag });
        parameters.push({ name: `@param${paramIndex+2}`, value: `#${cleanTag}` });
        parameters.push({ name: `@param${paramIndex+3}`, value: cleanSearch });
        paramIndex += 4;
      }

      if (title) {
        conditions.push(`CONTAINS(c.title, @param${paramIndex})`);
        parameters.push({ name: `@param${paramIndex}`, value: title });
        paramIndex++;
      }
      if (publisher) {
        conditions.push(`CONTAINS(c.publisher, @param${paramIndex})`);
        parameters.push({ name: `@param${paramIndex}`, value: publisher });
        paramIndex++;
      }
      if (producer) {
        conditions.push(`CONTAINS(c.producer, @param${paramIndex})`);
        parameters.push({ name: `@param${paramIndex}`, value: producer });
        paramIndex++;
      }
      if (genre) {
        conditions.push(`c.genre = @param${paramIndex}`);
        parameters.push({ name: `@param${paramIndex}`, value: genre });
        paramIndex++;
      }
      if (creator) {
        const cleanCreator = creator.trim().replace(/^@/, '');
        conditions.push(`(CONTAINS(c.creator.creatorName, @param${paramIndex}) OR CONTAINS(c.creator.user.username, @param${paramIndex+1}) OR CONTAINS(c.creator.user.displayName, @param${paramIndex}))`);
        parameters.push({ name: `@param${paramIndex}`, value: creator });
        parameters.push({ name: `@param${paramIndex+1}`, value: cleanCreator });
        paramIndex += 2;
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
      const orderField = sort === 'viewCount' ? 'c.viewCount' : 'c.createdAt';
      
      const querySpec = {
        query: `SELECT * FROM c ${whereClause} ORDER BY ${orderField} ${order.toUpperCase()} OFFSET ${skip} LIMIT ${limit}`,
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
          storageBlobName: v.storageBlobName,
          thumbnailBlobName: v.thumbnailBlobName,
          duration: v.duration,
          status: v.status,
          viewCount: v.viewCount,
          createdAt: typeof v.createdAt === 'string' ? v.createdAt : v.createdAt?.toISOString(),
          updatedAt: typeof v.updatedAt === 'string' ? v.updatedAt : v.updatedAt?.toISOString(),
          creator: v.creator,
        })),
        page,
        limit,
        total
      );
    } else {
      const conditions: Record<string, unknown>[] = [{ status: 'READY' }];

      if (searchTerm) {
        const cleanSearch = searchTerm.trim().replace(/^@/, '');
        const cleanTag = searchTerm.trim().replace(/^#/, '');
        conditions.push({
          OR: [
            { title: { contains: searchTerm } },
            { title: { contains: cleanTag } },
            { publisher: { contains: searchTerm } },
            { producer: { contains: searchTerm } },
            { description: { contains: searchTerm } },
            { description: { contains: cleanTag } },
            { description: { contains: `#${cleanTag}` } },
            { creator: { creatorName: { contains: searchTerm } } },
            { creator: { user: { username: { contains: cleanSearch } } } },
            { creator: { user: { displayName: { contains: searchTerm } } } },
          ],
        });
      }

      if (title) conditions.push({ title: { contains: title } });
      if (publisher) conditions.push({ publisher: { contains: publisher } });
      if (producer) conditions.push({ producer: { contains: producer } });
      if (genre) conditions.push({ genre });
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

      let orderBy: Record<string, string> = { createdAt: order };
      if (sort === 'viewCount') {
        orderBy = { viewCount: order };
      }

      const [videos, total] = await Promise.all([
        db.video.findMany({
          where,
          include: {
            creator: {
              select: {
                id: true,
                creatorName: true,
                user: {
                  select: { id: true, username: true, displayName: true, avatarUrl: true },
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
    }
  } catch (error) {
    return apiError('INTERNAL_SERVER_ERROR');
  }
}
