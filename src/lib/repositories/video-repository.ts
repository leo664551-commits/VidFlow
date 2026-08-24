import { getContainer } from '@/lib/cosmos';
import { db } from '@/lib/db';
import type { Genre, AgeRating, VideoStatus } from '@/types';
import { v4 as uuidv4 } from 'uuid';

export interface CosmosVideo {
  id: string;
  creatorId: string;
  title: string;
  publisher: string;
  producer: string;
  genre: Genre;
  ageRating: AgeRating;
  description: string | null;
  storageBlobName: string | null;
  thumbnailBlobName: string | null;
  duration: number | null;
  status: VideoStatus;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  pinnedCommentId: string | null;
  createdAt: string;
  updatedAt: string;
  creator?: {
    id: string;
    creatorName: string;
    user: {
      id: string;
      displayName: string;
      username: string | null;
      avatarUrl: string | null;
    };
  };
}

export async function findVideoById(id: string): Promise<CosmosVideo | null> {
  const container = getContainer('videos');
  if (!container) {
    const video = await db.video.findUnique({
      where: { id },
      include: {
        creator: {
          include: {
            user: { select: { id: true, displayName: true, username: true, avatarUrl: true } },
          },
        },
        _count: { select: { likes: true, comments: true } },
      },
    });
    if (!video) return null;
    return {
      ...video,
      genre: video.genre as Genre,
      ageRating: video.ageRating as AgeRating,
      status: video.status as VideoStatus,
      likeCount: video._count.likes,
      commentCount: video._count.comments,
      createdAt: video.createdAt.toISOString(),
      updatedAt: video.updatedAt.toISOString(),
    } as CosmosVideo;
  }

  const querySpec = {
    query: 'SELECT * FROM c WHERE c.id = @id',
    parameters: [{ name: '@id', value: id }],
  };

  const { resources } = await container.items.query<CosmosVideo>(querySpec).fetchAll();
  return resources[0] || null;
}

export async function createVideo(data: Omit<CosmosVideo, 'id' | 'likeCount' | 'commentCount' | 'viewCount' | 'createdAt' | 'updatedAt'> & { id?: string }): Promise<CosmosVideo> {
  const id = data.id || uuidv4();
  const now = new Date().toISOString();
  const newVideo: CosmosVideo = {
    ...data,
    id,
    likeCount: 0,
    commentCount: 0,
    viewCount: 0,
    pinnedCommentId: null,
    createdAt: now,
    updatedAt: now,
  };

  const container = getContainer('videos');
  if (!container) {
    const video = await db.video.create({
      data: {
        id: newVideo.id,
        creatorId: newVideo.creatorId,
        title: newVideo.title,
        publisher: newVideo.publisher,
        producer: newVideo.producer,
        genre: newVideo.genre,
        ageRating: newVideo.ageRating,
        description: newVideo.description,
        storageBlobName: newVideo.storageBlobName,
        thumbnailBlobName: newVideo.thumbnailBlobName,
        duration: newVideo.duration,
        status: newVideo.status,
      },
    });
    return {
      ...newVideo,
      id: video.id,
    };
  }

  const { resource } = await container.items.create(newVideo);
  return resource!;
}

export async function updateVideo(id: string, updates: Partial<CosmosVideo>): Promise<CosmosVideo | null> {
  const existing = await findVideoById(id);
  if (!existing) return null;

  const updated: CosmosVideo = {
    ...existing,
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  const container = getContainer('videos');
  if (!container) {
    const video = await db.video.update({
      where: { id },
      data: {
        title: updates.title,
        publisher: updates.publisher,
        producer: updates.producer,
        genre: updates.genre,
        ageRating: updates.ageRating,
        description: updates.description,
        storageBlobName: updates.storageBlobName,
        thumbnailBlobName: updates.thumbnailBlobName,
        duration: updates.duration,
        status: updates.status,
        pinnedCommentId: updates.pinnedCommentId,
        viewCount: updates.viewCount,
      },
    });
    return { ...updated, id: video.id };
  }

  const { resource } = await container.item(id, existing.genre).replace(updated);
  return resource!;
}

export async function getAllReadyCandidateVideos(genre?: string): Promise<CosmosVideo[]> {
  const container = getContainer('videos');
  if (!container) {
    const where: Record<string, unknown> = { status: 'READY' };
    if (genre) where.genre = genre;
    const videos = await db.video.findMany({
      where,
      include: {
        creator: {
          include: {
            user: { select: { id: true, displayName: true, username: true, avatarUrl: true } },
          },
        },
        _count: { select: { likes: true, comments: true } },
      },
    });
    return videos.map((v) => ({
      ...v,
      genre: v.genre as Genre,
      ageRating: v.ageRating as AgeRating,
      status: v.status as VideoStatus,
      likeCount: v._count.likes,
      commentCount: v._count.comments,
      createdAt: v.createdAt.toISOString(),
      updatedAt: v.updatedAt.toISOString(),
    })) as CosmosVideo[];
  }

  let query = 'SELECT * FROM c WHERE c.status = "READY"';
  const parameters: Array<{ name: string; value: string }> = [];

  if (genre) {
    query += ' AND c.genre = @genre';
    parameters.push({ name: '@genre', value: genre });
  }

  const { resources } = await container.items.query<CosmosVideo>({ query, parameters }).fetchAll();
  return resources;
}
