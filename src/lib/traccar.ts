// ============================================================
// Cliente de API de Traccar (lado cliente).
// Todas las peticiones pasan por nuestros Route Handlers proxy,
// que ocultan la sesión y evitan problemas de CORS.
// ============================================================

import type { SessionUser, TraccarDevice, TraccarPosition } from '@/types/traccar';

export class TraccarApiError extends Error {
  readonly status: number;
  readonly code?: string;

  constructor(message: string, status = 0, code?: string) {
    super(message);
    this.name = 'TraccarApiError';
    this.status = status;
    this.code = code;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    credentials: 'same-origin',
    cache: 'no-store',
  });

  if (!res.ok) {
    let message = `La API de Traccar respondió con el estado ${res.status}.`;
    let code: string | undefined;
    try {
      const data = await res.json();
      code = data?.error;
      if (typeof data?.message === 'string') message = data.message;
    } catch {
      // sin cuerpo JSON, usamos el mensaje por defecto
    }
    throw new TraccarApiError(message, res.status, code);
  }

  return res.json() as Promise<T>;
}

/** ¿El error corresponde a credenciales inválidas o sesión expirada (HTTP 401)? */
export function isUnauthorizedError(error: unknown): boolean {
  return error instanceof TraccarApiError && error.status === 401;
}

/** Inicia sesión contra Traccar. Sin credenciales usa las del servidor (env). */
export function loginTraccar(email?: string, password?: string): Promise<SessionUser> {
  return request<SessionUser>('/api/traccar/session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
}

/** Cierra la sesión actual (invalida la cookie de sesión). */
export function logoutTraccar(): Promise<{ ok: boolean }> {
  return request<{ ok: boolean }>('/api/traccar/session', { method: 'DELETE' });
}

/** Lista de dispositivos (vehículos) de la flota. */
export function fetchDevices(): Promise<TraccarDevice[]> {
  return request<TraccarDevice[]>('/api/traccar/devices');
}

/** Últimas posiciones conocidas de todos los dispositivos. */
export function fetchPositions(): Promise<TraccarPosition[]> {
  return request<TraccarPosition[]>('/api/traccar/positions');
}
