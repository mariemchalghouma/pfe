import { verifyAuth, unauthorizedResponse } from '@/lib/auth';
import { getMe } from '@/controllers/authController';

export async function GET(request) {
  const user = verifyAuth(request);
  if (!user) return unauthorizedResponse();
  return getMe(user);
}

