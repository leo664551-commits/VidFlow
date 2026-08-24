import { initializeCosmosContainers, getContainer } from '../src/lib/cosmos';
import { hashPassword } from '../src/lib/auth';
import { v4 as uuidv4 } from 'uuid';

async function seedCosmos() {
  console.log('=== Initializing Azure Cosmos DB Containers ===');
  const initialized = await initializeCosmosContainers();
  if (!initialized) {
    console.error('Failed to initialize Cosmos DB. Please verify COSMOS_ENDPOINT and COSMOS_KEY in your .env');
    process.exit(1);
  }

  const usersContainer = getContainer('users');
  const videosContainer = getContainer('videos');

  if (!usersContainer || !videosContainer) {
    console.error('Containers could not be retrieved.');
    process.exit(1);
  }

  console.log('Seeding initial Super Administrator...');
  const adminPassword = await hashPassword('Admin123!@#');
  const adminUser = {
    id: uuidv4(),
    email: 'admin@vidflow.com',
    username: 'admin',
    displayName: 'System Administrator',
    password: adminPassword,
    role: 'ADMIN',
    status: 'ACTIVE',
    bio: 'VidFlow Head Administrator',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  await usersContainer.items.upsert(adminUser);

  console.log('Seeding sample Creator...');
  const creatorPassword = await hashPassword('Creator123!@#');
  const creatorId = uuidv4();
  const creatorUser = {
    id: creatorId,
    email: 'creator@vidflow.com',
    username: 'alexcreative',
    displayName: 'Alex Rivers',
    password: creatorPassword,
    role: 'CREATOR',
    status: 'ACTIVE',
    bio: 'Digital artist and visual storyteller.',
    category: 'Animation',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    creatorProfile: {
      id: uuidv4(),
      userId: creatorId,
      creatorName: 'Alex Creative Studio',
      description: 'Creating high-energy short animations and visual effects.',
      category: 'Animation',
    },
  };
  await usersContainer.items.upsert(creatorUser);

  console.log('Seeding sample Short Video...');
  const sampleVideo = {
    id: uuidv4(),
    creatorId,
    title: 'Neon Cyberpunk City Flight',
    publisher: 'Alex Creative Studio',
    producer: 'Alex Rivers',
    genre: 'ANIMATION',
    ageRating: 'PG',
    description: 'A visual flight through futuristic neon skyscrapers.',
    storageBlobName: null,
    thumbnailBlobName: null,
    duration: 15,
    status: 'READY',
    viewCount: 1250,
    likeCount: 340,
    commentCount: 42,
    pinnedCommentId: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    creator: {
      id: creatorUser.creatorProfile.id,
      creatorName: creatorUser.creatorProfile.creatorName,
      user: {
        id: creatorId,
        displayName: creatorUser.displayName,
        username: creatorUser.username,
        avatarUrl: null,
      },
    },
  };
  await videosContainer.items.upsert(sampleVideo);

  console.log('=== Azure Cosmos DB Seeding Complete! ===');
  console.log('Admin login: admin@vidflow.com / Admin123!@#');
  console.log('Creator login: creator@vidflow.com / Creator123!@#');
}

seedCosmos().catch((err) => {
  console.error('Error during Cosmos DB seeding:', err);
  process.exit(1);
});
