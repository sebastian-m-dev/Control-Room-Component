import { NextRequest, NextResponse } from 'next/server';
import {
  TRACCAR_BASE_URL,
  TRACCAR_EMAIL,
  TRACCAR_PASSWORD,
  SESSION_COOKIE_NAME,
} from '@/lib/config';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/traccar/session
 * Autentica contra la API pública de Traccar (POST /api/session)
 * y guarda el JSESSIONID en una cookie httpOnly de nuestro dominio.
 */
export async function POST(request: NextRequest) {
  let email = TRACCAR_EMAIL;
  let password = TRACCAR_PASSWORD;

  try {
    const body = await request.json();
    if (typeof body?.email === 'string' && body.email.trim()) email = body.email.trim();
    if (typeof body?.password === 'string' && body.password) password = body.password;
  } catch {
    // sin cuerpo: usamos las credenciales de entorno
  }

  let upstream: Response;
  try {
    upstream = await fetch(`${TRACCAR_BASE_URL}/api/session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
      },
      body: new URLSearchParams({ email, password }).toString(),
      cache: 'no-store',
      redirect: 'follow',
    });
  } catch {
    return NextResponse.json(
      {
        error: 'NETWORK_ERROR',
        message:
          'No se pudo conectar con el servidor de Traccar. Verifica tu conexión o el endpoint configurado.',
      },
      { status: 502 },
    );
  }

  if (!upstream.ok) {
    // El modo demo (datos simulados) se gestiona solo en el cliente
    // (toggle "Modo Demo"), sin tocar el servidor de Traccar.
    if (upstream.status === 401) {
      return NextResponse.json(
        {
          error: 'AUTH_FAILED',
          message:
            'El servidor de Traccar no aceptó las credenciales. Verifica tu usuario y contraseña, o usa "Probar con datos de demostración" para ver la app con datos simulados.',
        },
        { status: upstream.status },
      );
    }
  }

  const user = await upstream.json().catch(() => ({}));

  // Extraemos la cookie de sesión JSESSIONID que devuelve Traccar
  const setCookies = upstream.headers.getSetCookie();
  const sessionCookie = setCookies.find((c) => c.toLowerCase().startsWith('jsessionid='));
  const token = sessionCookie ? sessionCookie.split(';')[0].split('=').slice(1).join('=') : '';

  const response = NextResponse.json(user);
  if (token) {
    response.cookies.set(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 60 * 60 * 24,
    });
  }
  return response;
}

/**
 * DELETE /api/traccar/session
 * Cierra la sesión: invalida la cookie de sesión local.
 */
export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE_NAME, '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0,
  });
  return response;
}
