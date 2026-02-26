import { verifyAuth, unauthorizedResponse } from '@/lib/auth';
import { updatePOI, deletePOI } from '@/controllers/poiController';

export async function PUT(request, context) {
  const user = verifyAuth(request);
  if (!user) return unauthorizedResponse();

  const { id } = await context.params;
  return updatePOI(id, request);
}

export async function DELETE(request, context) {
  const user = verifyAuth(request);
  if (!user) return unauthorizedResponse();

  const { id } = await context.params;
  return deletePOI(id);
}
