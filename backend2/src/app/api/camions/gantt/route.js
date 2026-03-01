import { getCamionsGantt } from '@/controllers/camionsController';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const date = searchParams.get('date') || new Date().toISOString().split('T')[0];
  return getCamionsGantt(date);
}
