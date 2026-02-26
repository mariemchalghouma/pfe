import { verifyAuth, unauthorizedResponse } from '@/lib/auth';
import { getPOIHistory } from '@/controllers/poiController';

export async function GET(request) {
  const user = verifyAuth(request);
  if (!user) return unauthorizedResponse();
  return getPOIHistory();
}
