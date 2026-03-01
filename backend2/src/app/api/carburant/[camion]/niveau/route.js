import { getNiveauCarburant } from '@/controllers/carburantController';

export async function GET(request, { params }) {
  const { camion } = await params;
  const { searchParams } = new URL(request.url);

  const date = searchParams.get('date');
  const dateStart = searchParams.get('dateStart');
  const dateEnd = searchParams.get('dateEnd');

  if (!date && !dateStart) {
    return Response.json(
      { success: false, message: 'Le paramètre date ou dateStart est requis' },
      { status: 400 }
    );
  }

  return await getNiveauCarburant(camion, { date, dateStart, dateEnd });
}
