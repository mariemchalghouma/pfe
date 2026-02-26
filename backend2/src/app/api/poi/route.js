import { verifyAuth, unauthorizedResponse } from '@/lib/auth';
import { getPOIs, createPOI } from '@/controllers/poiController';

export async function GET(request) {
  const user = verifyAuth(request);
  if (!user) return unauthorizedResponse();
  return getPOIs();
}

export async function POST(request) {
  const user = verifyAuth(request);
  if (!user) return unauthorizedResponse();
  return createPOI(request);
}
