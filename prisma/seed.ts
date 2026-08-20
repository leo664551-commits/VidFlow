import { PrismaClient } from '@prisma/client';
import { hash } from 'bcryptjs';

const prisma = new PrismaClient();

const GENRES = [
  'ACTION', 'COMEDY', 'DRAMA', 'HORROR', 'SCIENCE_FICTION',
  'DOCUMENTARY', 'ANIMATION', 'THRILLER', 'ROMANCE', 'MUSIC', 'OTHER',
] as const;

const AGE_RATINGS = ['G', 'PG', 'PG-13', 'R', 'NC-17'] as const;

const sampleVideos = [
  { title: 'The Last Horizon', publisher: 'Stellar Films', producer: 'James Chen', genre: 'SCIENCE_FICTION' as const, ageRating: 'PG-13' as const, description: 'A team of astronauts discovers a signal from beyond the known universe.' },
  { title: 'Laugh Out Loud', publisher: 'Comedy Central Studios', producer: 'Sarah Miller', genre: 'COMEDY' as const, ageRating: 'PG' as const, description: 'A stand-up comedian navigates the hilarious world of modern dating.' },
  { title: 'Shadows of War', publisher: 'Epic Productions', producer: 'Robert Zhang', genre: 'ACTION' as const, ageRating: 'R' as const, description: 'An ex-special forces operative must protect his family from a vengeful cartel.' },
  { title: 'The Silent Forest', publisher: 'Nature Films', producer: 'Emily Watson', genre: 'DOCUMENTARY' as const, ageRating: 'G' as const, description: 'An immersive journey into the world\'s oldest and most mysterious forests.' },
  { title: 'Dragon\'s Dream', publisher: 'Animation World', producer: 'Yuki Tanaka', genre: 'ANIMATION' as const, ageRating: 'PG' as const, description: 'A young girl befriends a dragon and embarks on an epic adventure.' },
  { title: 'The Dark Corner', publisher: 'Mystery Studios', producer: 'David Brown', genre: 'THRILLER' as const, ageRating: 'R' as const, description: 'A detective uncovers a conspiracy that reaches the highest levels of government.' },
  { title: 'Love in Tokyo', publisher: 'Romance Films', producer: 'Sakura Ito', genre: 'ROMANCE' as const, ageRating: 'PG' as const, description: 'Two strangers meet in Tokyo and discover an unexpected connection.' },
  { title: 'The Final Beat', publisher: 'Music Pictures', producer: 'Carlos Rivera', genre: 'MUSIC' as const, ageRating: 'PG' as const, description: 'A fading rock star makes one last attempt at redemption through music.' },
  { title: 'Whispers in the Dark', publisher: 'Horror House', producer: 'Lisa Park', genre: 'HORROR' as const, ageRating: 'R' as const, description: 'A family moves into a centuries-old mansion with a terrifying secret.' },
  { title: 'Broken Pieces', publisher: 'Drama Works', producer: 'Michael Lee', genre: 'DRAMA' as const, ageRating: 'PG-13' as const, description: 'Three siblings reunite after their father\'s death and confront long-buried secrets.' },
];

function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function main() {
  console.log('Seeding database...');

  // Clean existing data
  await prisma.auditLog.deleteMany();
  await prisma.videoView.deleteMany();
  await prisma.rating.deleteMany();
  await prisma.comment.deleteMany();
  await prisma.video.deleteMany();
  await prisma.creatorProfile.deleteMany();
  await prisma.user.deleteMany();

  // Create admin
  const adminPassword = await hash('Admin123!', 12);
  const admin = await prisma.user.create({
    data: {
      email: 'admin@platform.com',
      displayName: 'Admin',
      password: adminPassword,
      role: 'ADMIN',
      status: 'ACTIVE',
    },
  });
  console.log('Created admin:', admin.email);

  // Create creators
  const creatorPassword = await hash('Creator123!', 12);
  const creator1User = await prisma.user.create({
    data: {
      email: 'creator1@platform.com',
      displayName: 'James Chen',
      password: creatorPassword,
      role: 'CREATOR',
      status: 'ACTIVE',
    },
  });

  const creator1Profile = await prisma.creatorProfile.create({
    data: {
      userId: creator1User.id,
      creatorName: 'Stellar Studios',
      description: 'Award-winning science fiction and action film studio.',
    },
  });

  const creator2User = await prisma.user.create({
    data: {
      email: 'creator2@platform.com',
      displayName: 'Sarah Miller',
      password: creatorPassword,
      role: 'CREATOR',
      status: 'ACTIVE',
    },
  });

  const creator2Profile = await prisma.creatorProfile.create({
    data: {
      userId: creator2User.id,
      creatorName: 'Comedy Central Studios',
      description: 'Making the world laugh, one video at a time.',
    },
  });

  console.log('Created creators:', creator1User.email, creator2User.email);

  // Create consumers
  const consumerPassword = await hash('Consumer123!', 12);
  const consumers = [];
  for (let i = 1; i <= 5; i++) {
    const consumer = await prisma.user.create({
      data: {
        email: `consumer${i}@platform.com`,
        displayName: `Consumer ${i}`,
        password: consumerPassword,
        role: 'CONSUMER',
        status: 'ACTIVE',
      },
    });
    consumers.push(consumer);
  }
  console.log(`Created ${consumers.length} consumers`);

  // Create sample videos (split between two creators)
  const videos = [];
  for (let i = 0; i < sampleVideos.length; i++) {
    const sample = sampleVideos[i];
    const creatorId = i < 5 ? creator1User.id : creator2User.id;
    const video = await prisma.video.create({
      data: {
        creatorId,
        title: sample.title,
        publisher: sample.publisher,
        producer: sample.producer,
        genre: sample.genre,
        ageRating: sample.ageRating,
        description: sample.description,
        storageBlobName: `videos/sample/sample-${i + 1}.mp4`,
        thumbnailBlobName: null,
        duration: randomInt(120, 600),
        status: 'READY',
        viewCount: randomInt(50, 5000),
      },
    });
    videos.push(video);
  }
  console.log(`Created ${videos.length} sample videos`);

  // Create sample comments
  const commentTexts = [
    'This was an amazing video! Really enjoyed it.',
    'Great content, looking forward to more.',
    'The production quality is outstanding.',
    'Interesting perspective, made me think.',
    'Could use some improvements but overall good.',
    'One of the best I\'ve seen this year!',
    'The story was captivating from start to finish.',
    'Shared this with all my friends.',
    'Would love to see a sequel.',
    'The visuals were absolutely stunning.',
  ];

  let commentCount = 0;
  for (let v = 0; v < videos.length; v++) {
    const numComments = randomInt(2, 4);
    for (let c = 0; c < numComments; c++) {
      const consumer = consumers[randomInt(0, consumers.length - 1)];
      await prisma.comment.create({
        data: {
          videoId: videos[v].id,
          userId: consumer.id,
          content: commentTexts[randomInt(0, commentTexts.length - 1)],
          status: 'VISIBLE',
        },
      });
      commentCount++;
    }
  }
  console.log(`Created ${commentCount} comments`);

  // Create sample ratings
  let ratingCount = 0;
  for (let v = 0; v < videos.length; v++) {
    const numRatings = randomInt(2, 5);
    const usedConsumers = new Set<string>();
    for (let r = 0; r < numRatings; r++) {
      let consumer: typeof consumers[0];
      let attempts = 0;
      do {
        consumer = consumers[randomInt(0, consumers.length - 1)];
        attempts++;
      } while (usedConsumers.has(consumer.id) && attempts < 10);
      if (usedConsumers.has(consumer.id)) continue;
      usedConsumers.add(consumer.id);

      await prisma.rating.create({
        data: {
          videoId: videos[v].id,
          userId: consumer.id,
          rating: randomInt(1, 5),
        },
      });
      ratingCount++;
    }
  }
  console.log(`Created ${ratingCount} ratings`);

  console.log('Seeding complete!');
  console.log('---');
  console.log('Admin: admin@platform.com / Admin123!');
  console.log('Creator 1: creator1@platform.com / Creator123!');
  console.log('Creator 2: creator2@platform.com / Creator123!');
  console.log('Consumers: consumer1-5@platform.com / Consumer123!');
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
