import { getContainer } from '@/lib/cosmos';
import { db } from '@/lib/db';
import type { AuthUser, UserRole, UserStatus } from '@/types';
import { v4 as uuidv4 } from 'uuid';

export interface CosmosUser {
  id: string;
  email: string;
  username: string;
  displayName: string;
  password?: string;
  role: UserRole;
  status: UserStatus;
  bio?: string;
  avatarUrl?: string | null;
  gender?: string;
  website?: string | null;
  instagram?: string | null;
  youtube?: string | null;
  twitter?: string | null;
  contactEmail?: string | null;
  category?: string;
  categoryChangeCount?: number;
  createdAt: string;
  updatedAt: string;
  creatorProfile?: {
    id: string;
    userId: string;
    creatorName: string;
    description: string | null;
    category?: string;
  } | null;
}

export async function findUserByEmail(email: string): Promise<CosmosUser | null> {
  const container = getContainer('users');
  if (!container) {
    // Fallback to Prisma if Cosmos is not connected
    const user = await db.user.findUnique({
      where: { email: email.toLowerCase() },
      include: { creatorProfile: true },
    });
    if (!user) return null;
    return {
      ...user,
      role: user.role as UserRole,
      status: user.status as UserStatus,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
      creatorProfile: user.creatorProfile
        ? {
            id: user.creatorProfile.id,
            userId: user.creatorProfile.userId,
            creatorName: user.creatorProfile.creatorName,
            description: user.creatorProfile.description,
          }
        : null,
    } as CosmosUser;
  }

  const querySpec = {
    query: 'SELECT * FROM c WHERE LOWER(c.email) = @email',
    parameters: [{ name: '@email', value: email.toLowerCase() }],
  };

  const { resources } = await container.items.query<CosmosUser>(querySpec).fetchAll();
  return resources[0] || null;
}

export async function findUserById(id: string): Promise<CosmosUser | null> {
  const container = getContainer('users');
  if (!container) {
    const user = await db.user.findUnique({
      where: { id },
      include: { creatorProfile: true },
    });
    if (!user) return null;
    return {
      ...user,
      role: user.role as UserRole,
      status: user.status as UserStatus,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
      creatorProfile: user.creatorProfile
        ? {
            id: user.creatorProfile.id,
            userId: user.creatorProfile.userId,
            creatorName: user.creatorProfile.creatorName,
            description: user.creatorProfile.description,
          }
        : null,
    } as CosmosUser;
  }

  try {
    const { resource } = await container.item(id, id).read<CosmosUser>();
    return resource || null;
  } catch {
    return null;
  }
}

export async function createUser(data: Omit<CosmosUser, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }): Promise<CosmosUser> {
  const id = data.id || uuidv4();
  const now = new Date().toISOString();
  const newUser: CosmosUser = {
    ...data,
    id,
    email: data.email.toLowerCase(),
    username: data.username || data.email.split('@')[0].toLowerCase().replace(/[^a-z0-9_]/g, ''),
    createdAt: now,
    updatedAt: now,
  };

  const container = getContainer('users');
  if (!container) {
    const user = await db.user.create({
      data: {
        id: newUser.id,
        email: newUser.email,
        username: newUser.username,
        displayName: newUser.displayName,
        password: newUser.password || '',
        role: newUser.role,
        status: newUser.status,
        bio: newUser.bio,
        category: newUser.category,
      },
    });
    return {
      ...newUser,
      id: user.id,
    };
  }

  const { resource } = await container.items.create(newUser);
  return resource!;
}

export async function updateUser(id: string, updates: Partial<CosmosUser>): Promise<CosmosUser | null> {
  const existing = await findUserById(id);
  if (!existing) return null;

  const updated: CosmosUser = {
    ...existing,
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  const container = getContainer('users');
  if (!container) {
    const user = await db.user.update({
      where: { id },
      data: {
        displayName: updates.displayName,
        username: updates.username,
        bio: updates.bio,
        avatarUrl: updates.avatarUrl,
        gender: updates.gender,
        website: updates.website,
        instagram: updates.instagram,
        youtube: updates.youtube,
        twitter: updates.twitter,
        contactEmail: updates.contactEmail,
        category: updates.category,
        status: updates.status,
      },
    });
    return { ...updated, id: user.id };
  }

  const { resource } = await container.item(id, id).replace(updated);
  return resource!;
}

export async function getPaginatedUsers(params: {
  page?: number;
  limit?: number;
  search?: string;
  role?: string;
  status?: string;
}): Promise<{ data: CosmosUser[]; total: number }> {
  const page = params.page || 1;
  const limit = params.limit || 20;
  const offset = (page - 1) * limit;

  const container = getContainer('users');
  if (!container) {
    const where: Record<string, unknown> = {};
    if (params.role) where.role = params.role;
    if (params.status) where.status = params.status;
    if (params.search) {
      where.OR = [
        { displayName: { contains: params.search } },
        { email: { contains: params.search } },
        { username: { contains: params.search } },
      ];
    }
    const [users, total] = await Promise.all([
      db.user.findMany({
        where,
        skip: offset,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      db.user.count({ where }),
    ]);
    return {
      data: users.map((u) => ({
        ...u,
        role: u.role as UserRole,
        status: u.status as UserStatus,
        createdAt: u.createdAt.toISOString(),
        updatedAt: u.updatedAt.toISOString(),
      })) as CosmosUser[],
      total,
    };
  }

  let whereClauses: string[] = [];
  const parameters: Array<{ name: string; value: string }> = [];

  if (params.role) {
    whereClauses.push('c.role = @role');
    parameters.push({ name: '@role', value: params.role });
  }
  if (params.status) {
    whereClauses.push('c.status = @status');
    parameters.push({ name: '@status', value: params.status });
  }
  if (params.search) {
    whereClauses.push('(CONTAINS(LOWER(c.displayName), @search) OR CONTAINS(LOWER(c.email), @search) OR CONTAINS(LOWER(c.username), @search))');
    parameters.push({ name: '@search', value: params.search.toLowerCase() });
  }

  const whereStr = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';
  const query = `SELECT * FROM c ${whereStr} ORDER BY c.createdAt DESC OFFSET ${offset} LIMIT ${limit}`;
  const countQuery = `SELECT VALUE COUNT(1) FROM c ${whereStr}`;

  const [{ resources: data }, { resources: countRes }] = await Promise.all([
    container.items.query<CosmosUser>({ query, parameters }).fetchAll(),
    container.items.query<number>({ query: countQuery, parameters }).fetchAll(),
  ]);

  return { data, total: countRes[0] || 0 };
}
