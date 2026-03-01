import { getEcartCarburantByCamion } from '@/controllers/carburantController';

export async function GET(request, { params }) {
  const { camion } = await params;
  return await getEcartCarburantByCamion(camion);
}
