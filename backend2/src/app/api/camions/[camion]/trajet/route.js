import { getCamionTrajet } from '@/controllers/camionsController';
import { verifyAuth, unauthorizedResponse } from '@/lib/auth';

export async function GET(request, { params }) {
  const user = verifyAuth(request);
  if (!user) return unauthorizedResponse();

  const { camion } = await params;
  return getCamionTrajet(camion);
}

