import { NextRequest } from 'next/server';
import { getSession } from '@/lib/auth';
import { apiSuccess, apiError } from '@/lib/api-response';

export async function GET(request: NextRequest) {
  const user = await getSession(request);
  if (!user) {
    return apiError('UNAUTHORIZED');
  }
  return apiSuccess(user);
}
