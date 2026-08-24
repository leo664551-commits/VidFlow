import { CosmosClient, Database, Container } from '@azure/cosmos';
import { logger } from '@/lib/logger';

let cosmosClientInstance: CosmosClient | null = null;
let databaseInstance: Database | null = null;

export function getCosmosClient(): CosmosClient | null {
  const endpoint = process.env.COSMOS_ENDPOINT || '';
  const key = process.env.COSMOS_KEY || '';
  if (!endpoint || !key) return null;
  if (!cosmosClientInstance) {
    cosmosClientInstance = new CosmosClient({
      endpoint,
      key,
      connectionPolicy: {
        requestTimeout: 15000,
        retryOptions: {
          maxRetryAttemptCount: 3,
          fixedRetryIntervalInMilliseconds: 1000,
          maxWaitTimeInSeconds: 10,
        },
      },
    });
  }
  return cosmosClientInstance;
}

export function getCosmosDatabase(): Database | null {
  const client = getCosmosClient();
  if (!client) return null;
  const databaseId = process.env.COSMOS_DATABASE || 'vidflow';
  if (!databaseInstance) {
    databaseInstance = client.database(databaseId);
  }
  return databaseInstance;
}

export type ContainerName =
  | 'users'
  | 'creatorProfiles'
  | 'videos'
  | 'comments'
  | 'commentLikes'
  | 'videoLikes'
  | 'creatorRatings'
  | 'videoWatches'
  | 'videoViews'
  | 'auditLogs'
  | 'creatorApplications'
  | 'notifications'
  | 'profileViews'
  | 'videoShares'
  | 'follows';

export const CONTAINER_PARTITION_KEYS: Record<ContainerName, string> = {
  users: '/id',
  creatorProfiles: '/userId',
  videos: '/genre',
  comments: '/videoId',
  commentLikes: '/commentId',
  videoLikes: '/videoId',
  creatorRatings: '/creatorId',
  videoWatches: '/userId',
  videoViews: '/videoId',
  auditLogs: '/actorUserId',
  creatorApplications: '/userId',
  notifications: '/userId',
  profileViews: '/profileUserId',
  videoShares: '/videoId',
  follows: '/followerId',
};

const containerCache = new Map<ContainerName, Container>();

export function getContainer(name: ContainerName): Container | null {
  if (containerCache.has(name)) {
    return containerCache.get(name)!;
  }
  const db = getCosmosDatabase();
  if (!db) return null;
  const container = db.container(name);
  containerCache.set(name, container);
  return container;
}

/**
 * Initializes and auto-provisions all Cosmos DB containers if they don't exist.
 */
export async function initializeCosmosContainers(): Promise<boolean> {
  const client = getCosmosClient();
  if (!client) {
    logger.warn('Cosmos DB credentials not configured in environment variables.');
    return false;
  }

  try {
    const databaseId = process.env.COSMOS_DATABASE || 'vidflow';
    
    // Check if database exists, if not create with shared 400 RU/s throughput
    let database: Database;
    try {
      const db = client.database(databaseId);
      const { resource } = await db.read();
      if (resource) {
        // Verify if database has shared throughput offer
        const offer = await db.readOffer();
        if (!offer?.resource) {
          // Database was created without shared throughput; drop and recreate with shared throughput
          await db.delete();
          const { database: newDb } = await client.databases.create({
            id: databaseId,
            throughput: 400,
          });
          database = newDb;
        } else {
          database = db;
        }
      } else {
        const { database: newDb } = await client.databases.create({
          id: databaseId,
          throughput: 400,
        });
        database = newDb;
      }
    } catch {
      const { database: newDb } = await client.databases.createIfNotExists({
        id: databaseId,
        throughput: 400,
      });
      database = newDb;
    }

    databaseInstance = database;

    for (const [name, partitionKey] of Object.entries(CONTAINER_PARTITION_KEYS)) {
      await database.containers.createIfNotExists({
        id: name,
        partitionKey: { paths: [partitionKey] },
      });
    }

    logger.info('Cosmos DB database and containers initialized successfully with shared throughput.');
    return true;
  } catch (error) {
    logger.error('Failed to initialize Cosmos DB containers', { error: (error as Error).message });
    return false;
  }
}
