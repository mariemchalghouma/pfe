import { getEcartCarburant } from '@/controllers/carburantController';

export async function GET(request) {
  return await getEcartCarburant();
}
