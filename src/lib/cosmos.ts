import { CosmosClient, Database, Container } from '@azure/cosmos';
import { logger } from '@/lib/logger';

const endpoint = process.env.COSMOS_ENDPOINT || '';
const key = process.env.COSMOS_KEY || '';
const databaseId = process.env.COSMOS_DATABASE || 'vidflow';

let cosmosClientInstance: CosmosClient | null = null;
let databaseInstance: Database | null = null;

export function getCosmosClient(): CosmosClient | null {
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
    const { database } = await client.databases.createIfNotExists({ id: databaseId });
    databaseInstance = database;

    for (const [name, partitionKey] of Object.entries(CONTAINER_PARTITION_KEYS)) {
      await database.containers.createIfNotExists({
        id: name,
        partitionKey: { paths: [partitionKey] },
      });
    }

    logger.info('Cosmos DB database and containers initialized successfully.');
    return true;
  } catch (error) {
    logger.error('Failed to initialize Cosmos DB containers', { error: (error as Error).message });
    return false;
  }
}
