import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/maps/directions
 * Proxy a la Google Directions API. La llamada se hace desde el servidor
 * porque los web services de Google Maps no envían cabeceras CORS y el
 * fetch directo desde el navegador sería bloqueado.
 */
export async function GET(request: NextRequest) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? '';
  if (!apiKey) {
    return NextResponse.json(
      { error: 'MISSING_KEY', message: 'Falta NEXT_PUBLIC_GOOGLE_MAPS_API_KEY.' },
      { status: 400 },
    );
  }

  const origin = request.nextUrl.searchParams.get('origin');
  const destination = request.nextUrl.searchParams.get('destination');
  if (!origin || !destination) {
    return NextResponse.json(
      { error: 'BAD_REQUEST', message: 'Se requieren origin y destination.' },
      { status: 400 },
    );
  }

  const url =
    'https://maps.googleapis.com/maps/api/directions/json' +
    `?origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}` +
    '&mode=driving&alternatives=false' +
    `&key=${encodeURIComponent(apiKey)}`;

  let upstream: Response;
  try {
    upstream = await fetch(url);
  } catch {
    return NextResponse.json(
      { error: 'NETWORK_ERROR', message: 'No se pudo conectar con Google Directions API.' },
      { status: 502 },
    );
  }

  const body = await upstream.text();
  return new NextResponse(body, {
    status: upstream.status,
    headers: { 'Content-Type': 'application/json' },
  });
}
