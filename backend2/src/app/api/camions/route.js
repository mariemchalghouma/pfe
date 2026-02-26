import { getCamions } from '@/controllers/camionsController';
import { verifyAuth, unauthorizedResponse } from '@/lib/auth';

export async function GET(request) {
  const user = verifyAuth(request);
  if (!user) return unauthorizedResponse();

  return getCamions();
}

