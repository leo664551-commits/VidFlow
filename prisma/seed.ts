import { PrismaClient } from '@prisma/client';
import { hash } from 'bcryptjs';

const prisma = new PrismaClient();

const sampleVideos = [
  { title: 'The Last Horizon', publisher: 'Stellar Films', producer: 'James Chen', genre: 'SCIENCE_FICTION', ageRating: 'PG-13', description: 'A team of astronauts discovers a signal from beyond the known universe.' },
  { title: 'Laugh Out Loud', publisher: 'Comedy Central Studios', producer: 'Sarah Miller', genre: 'COMEDY', ageRating: 'PG', description: 'A stand-up comedian navigates the hilarious world of modern dating.' },
  { title: 'Shadows of War', publisher: 'Epic Productions', producer: 'Robert Zhang', genre: 'ACTION', ageRating: 'R', description: 'An ex-special forces operative must protect his family from a vengeful cartel.' },
  { title: 'The Silent Forest', publisher: 'Nature Films', producer: 'Emily Watson', genre: 'DOCUMENTARY', ageRating: 'G', description: "An immersive journey into the world's oldest and most mysterious forests." },
  { title: "Dragon's Dream", publisher: 'Animation World', producer: 'Yuki Tanaka', genre: 'ANIMATION', ageRating: 'PG', description: 'A young girl befriends a dragon and embarks on an epic adventure.' },
  { title: 'The Dark Corner', publisher: 'Mystery Studios', producer: 'David Brown', genre: 'THRILLER', ageRating: 'R', description: 'A detective uncovers a conspiracy that reaches the highest levels of government.' },
  { title: 'Love in Tokyo', publisher: 'Romance Films', producer: 'Sakura Ito', genre: 'ROMANCE', ageRating: 'PG', description: 'Two strangers meet in Tokyo and discover an unexpected connection.' },
  { title: 'The Final Beat', publisher: 'Music Pictures', producer: 'Carlos Rivera', genre: 'MUSIC', ageRating: 'PG', description: 'A fading rock star makes one last attempt at redemption through music.' },
  { title: 'Whispers in the Dark', publisher: 'Horror House', producer: 'Lisa Park', genre: 'HORROR', ageRating: 'R', description: 'A family moves into a centuries-old mansion with a terrifying secret.' },
  { title: 'Broken Pieces', publisher: 'Drama Works', producer: 'Michael Lee', genre: 'DRAMA', ageRating: 'PG-13', description: "Three siblings reunite after their father's death and confront long-buried secrets." },
  { title: 'Neon Nights', publisher: 'Stellar Films', producer: 'James Chen', genre: 'SCIENCE_FICTION', ageRating: 'PG-13', description: 'In a cyberpunk city, a hacker uncovers a digital conspiracy.' },
  { title: 'Cooking with Fire', publisher: 'Comedy Central Studios', producer: 'Sarah Miller', genre: 'COMEDY', ageRating: 'PG', description: 'A chaotic cooking show where everything goes hilariously wrong.' },
];

function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function main() {
  console.log('Seeding database...');

  await prisma.auditLog.deleteMany();
  await prisma.commentLike.deleteMany();
  await prisma.creatorRating.deleteMany();
  await prisma.videoView.deleteMany();
  await prisma.videoLike.deleteMany();
  await prisma.comment.deleteMany();
  await prisma.video.deleteMany();
  await prisma.creatorProfile.deleteMany();
  await prisma.user.deleteMany();

  const adminPassword = await hash('Admin123!', 12);
  const creatorPassword = await hash('Creator123!', 12);
  const consumerPassword = await hash('Consumer123!', 12);

  const admin = await prisma.user.create({
    data: { email: 'admin@platform.com', displayName: 'Admin', password: adminPassword, role: 'ADMIN', status: 'ACTIVE' },
  });

  const creator1User = await prisma.user.create({
    data: { email: 'creator1@platform.com', displayName: 'James Chen', password: creatorPassword, role: 'CREATOR', status: 'ACTIVE' },
  });
  const creator1Profile = await prisma.creatorProfile.create({
    data: { userId: creator1User.id, creatorName: 'Stellar Studios', description: 'Award-winning science fiction and action film studio.' },
  });

  const creator2User = await prisma.user.create({
    data: { email: 'creator2@platform.com', displayName: 'Sarah Miller', password: creatorPassword, role: 'CREATOR', status: 'ACTIVE' },
  });
  const creator2Profile = await prisma.creatorProfile.create({
    data: { userId: creator2User.id, creatorName: 'Comedy Central Studios', description: 'Making the world laugh, one video at a time.' },
  });

  const consumers = [];
  for (let i = 1; i <= 5; i++) {
    const c = await prisma.user.create({
      data: { email: `consumer${i}@platform.com`, displayName: `Consumer ${i}`, password: consumerPassword, role: 'CONSUMER', status: 'ACTIVE' },
    });
    consumers.push(c);
  }

  const creatorProfiles = [creator1Profile, creator2Profile];

  const videos = [];
  for (let i = 0; i < sampleVideos.length; i++) {
    const s = sampleVideos[i];
    const creatorId = i < 6 ? creator1User.id : creator2User.id;
    const v = await prisma.video.create({
      data: {
        creatorId,
        title: s.title,
        publisher: s.publisher,
        producer: s.producer,
        genre: s.genre,
        ageRating: s.ageRating,
        description: s.description,
        storageBlobName: `videos/sample/sample-${i + 1}.mp4`,
        thumbnailBlobName: null,
        duration: randomInt(15, 180),
        status: 'READY',
        viewCount: randomInt(50, 5000),
      },
    });
    videos.push(v);
  }

  const commentTexts = [
    'This was amazing! Really enjoyed it',
    'Great content, looking forward to more!',
    'The production quality is outstanding',
    'Interesting perspective, made me think.',
    "One of the best I've seen this year!",
    'The story was captivating from start to finish.',
    'Shared this with all my friends.',
    'The visuals were absolutely stunning.',
    'Would love to see a sequel!',
    'This deserves way more views',
  ];

  const replyTexts = [
    'Totally agree with this!',
    'Facts!',
    'I was thinking the same thing',
    'Well said!',
    'Need more content like this',
  ];

  const creatorComments = [
    'Thanks for watching! More coming soon.',
    'Glad you enjoyed it! We put a lot of effort into this one.',
    'Appreciate the support! Stay tuned for part 2.',
  ];

  // Create comments, replies, and pinned comments
  for (let v = 0; v < videos.length; v++) {
    const numComments = randomInt(2, 5);
    let pinnedCommentId: string | null = null;
    const videoCreatorUser = v < 6 ? creator1User : creator2User;

    for (let c = 0; c < numComments; c++) {
      const consumer = consumers[randomInt(0, consumers.length - 1)];
      const comment = await prisma.comment.create({
        data: {
          videoId: videos[v].id,
          userId: consumer.id,
          content: commentTexts[randomInt(0, commentTexts.length - 1)],
          status: 'VISIBLE',
        },
      });

      // Like some comments by other users
      const numCommentLikes = randomInt(0, 3);
      const usedUsers = new Set<string>();
      for (let cl = 0; cl < numCommentLikes; cl++) {
        let liker = consumers[randomInt(0, consumers.length - 1)];
        let attempts = 0;
        while ((usedUsers.has(liker.id) || liker.id === consumer.id) && attempts < 10) {
          liker = consumers[randomInt(0, consumers.length - 1)];
          attempts++;
        }
        if (usedUsers.has(liker.id) || liker.id === consumer.id) continue;
        usedUsers.add(liker.id);
        await prisma.commentLike.create({
          data: { commentId: comment.id, userId: liker.id },
        });
      }

      // Add replies to some comments (including creator replies)
      if (Math.random() > 0.4) {
        const numReplies = randomInt(1, 3);
        for (let r = 0; r < numReplies; r++) {
          // Mix in creator replies
          const isCreatorReply = r === 0 && Math.random() > 0.4;
          const replier = isCreatorReply ? videoCreatorUser : consumers[randomInt(0, consumers.length - 1)];
          await prisma.comment.create({
            data: {
              videoId: videos[v].id,
              userId: replier.id,
              parentCommentId: comment.id,
              content: isCreatorReply
                ? creatorComments[randomInt(0, creatorComments.length - 1)]
                : replyTexts[randomInt(0, replyTexts.length - 1)],
              status: 'VISIBLE',
            },
          });
        }
      }
    }

    // Creator comments on their own video (and pin one)
    if (Math.random() > 0.3) {
      const creatorComment = await prisma.comment.create({
        data: {
          videoId: videos[v].id,
          userId: videoCreatorUser.id,
          content: creatorComments[randomInt(0, creatorComments.length - 1)],
          status: 'VISIBLE',
        },
      });
      pinnedCommentId = creatorComment.id;
    }

    // Pin the first comment if no creator comment was created
    if (!pinnedCommentId && Math.random() > 0.5) {
      const firstComment = await prisma.comment.findFirst({
        where: { videoId: videos[v].id, parentCommentId: null },
      });
      if (firstComment) {
        pinnedCommentId = firstComment.id;
      }
    }

    // Update video with pinned comment
    if (pinnedCommentId) {
      await prisma.video.update({
        where: { id: videos[v].id },
        data: { pinnedCommentId },
      });
    }
  }

  // Create video likes
  for (let v = 0; v < videos.length; v++) {
    const numLikes = randomInt(2, 5);
    const usedConsumers = new Set<string>();
    for (let l = 0; l < numLikes; l++) {
      let consumer = consumers[randomInt(0, consumers.length - 1)];
      let attempts = 0;
      while (usedConsumers.has(consumer.id) && attempts < 10) {
        consumer = consumers[randomInt(0, consumers.length - 1)];
        attempts++;
      }
      if (usedConsumers.has(consumer.id)) continue;
      usedConsumers.add(consumer.id);
      await prisma.videoLike.create({
        data: { videoId: videos[v].id, userId: consumer.id },
      });
    }
  }

  // Create creator ratings (consumers rate creators)
  for (const cp of creatorProfiles) {
    const usedConsumers = new Set<string>();
    const numRatings = randomInt(3, 5);
    for (let r = 0; r < numRatings; r++) {
      let consumer = consumers[randomInt(0, consumers.length - 1)];
      let attempts = 0;
      while (usedConsumers.has(consumer.id) && attempts < 10) {
        consumer = consumers[randomInt(0, consumers.length - 1)];
        attempts++;
      }
      if (usedConsumers.has(consumer.id)) continue;
      usedConsumers.add(consumer.id);
      await prisma.creatorRating.create({
        data: { creatorId: cp.id, userId: consumer.id, rating: randomInt(3, 5) },
      });
    }
  }

  console.log('Seeding complete!');
  console.log('Admin: admin@platform.com / Admin123!');
  console.log('Creator 1: creator1@platform.com / Creator123!');
  console.log('Creator 2: creator2@platform.com / Creator123!');
  console.log('Consumers: consumer1-5@platform.com / Consumer123!');
}

main()
  .catch((e) => { console.error('Seed failed:', e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
