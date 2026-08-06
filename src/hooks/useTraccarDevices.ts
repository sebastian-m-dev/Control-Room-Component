'use client';

import { useQuery } from '@tanstack/react-query';
import { loginTraccar, fetchDevices } from '@/lib/traccar';
import { fetchMockDevices } from '@/lib/mock';
import type { SessionUser } from '@/types/traccar';

/**
 * Gestión de la sesión contra Traccar.
 * En modo demo se resuelve sin red para que la app nunca se rompa.
 */
export function useTraccarSession(mockMode: boolean) {
  return useQuery({
    queryKey: ['traccar', 'session', { mock: mockMode }],
    queryFn: (): Promise<SessionUser> =>
      mockMode
        ? Promise.resolve({ id: 0, name: 'Modo Demo', login: 'demo' } as SessionUser)
        : loginTraccar(),
    staleTime: Infinity,
    gcTime: Infinity,
    retry: 1,
  });
}

/**
 * Lista de vehículos. Solo se dispara la petición real después de
 * que la sesión haya sido establecida (evita 401 por condición de carrera).
 */
export function useTraccarDevices(mockMode: boolean) {
  const session = useTraccarSession(mockMode);

  return useQuery({
    queryKey: ['traccar', 'devices', { mock: mockMode }],
    queryFn: () => (mockMode ? fetchMockDevices() : fetchDevices()),
    enabled: mockMode || session.isSuccess,
    refetchInterval: mockMode ? 30_000 : 60_000,
    staleTime: mockMode ? 10_000 : 15_000,
    retry: (failureCount, error) =>
      error instanceof Error && 'status' in error && (error as { status?: number }).status === 401
        ? false
        : failureCount < 2,
  });
}
