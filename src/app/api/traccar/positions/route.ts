import { NextRequest, NextResponse } from 'next/server';
import { TRACCAR_BASE_URL, SESSION_COOKIE_NAME } from '@/lib/config';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/traccar/positions
 * Reenvía GET /api/positions de Traccar usando la sesión guardada.
 */
export async function GET(request: NextRequest) {
  const jsessionid = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!jsessionid) {
    return NextResponse.json(
      { error: 'NOT_AUTHENTICATED', message: 'Sesión no iniciada en Traccar.' },
      { status: 401 },
    );
  }

  let upstream: Response;
  try {
    upstream = await fetch(`${TRACCAR_BASE_URL}/api/positions`, {
      headers: {
        Cookie: `JSESSIONID=${jsessionid}`,
        Accept: 'application/json',
      },
      cache: 'no-store',
    });
  } catch {
    return NextResponse.json(
      {
        error: 'NETWORK_ERROR',
        message: 'No se pudo conectar con el servidor de Traccar para obtener las posiciones.',
      },
      { status: 502 },
    );
  }

  const body = await upstream.text();
  return new NextResponse(body, {
    status: upstream.status,
    headers: { 'Content-Type': 'application/json' },
  });
}
