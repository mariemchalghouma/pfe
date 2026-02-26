import { verifyAuth, unauthorizedResponse } from '@/lib/auth';

export async function GET(request) {
  const user = verifyAuth(request);
  if (!user) return unauthorizedResponse();

  return Response.json({
    success: true,
    message: 'API is running',
    timestamp: new Date().toISOString(),
  });
}
