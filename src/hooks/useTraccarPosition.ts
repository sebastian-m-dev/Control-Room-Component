'use client';

import { useQuery } from '@tanstack/react-query';
import { fetchPositions } from '@/lib/traccar';
import { fetchMockPositions } from '@/lib/mock';
import type { TraccarPosition } from '@/types/traccar';

/**
 * Última posición conocida por cada dispositivo (flota completa).
 * Polling cada 2.5s (1.5s en modo demo) para alimentar el mapa en
 * vista "todos los vehículos" y la tarjeta de estado en tiempo real.
 */
export function useTraccarFleet(mockMode: boolean) {
  return useQuery({
    queryKey: ['traccar', 'fleet', { mock: mockMode }],
    queryFn: async (): Promise<Record<number, TraccarPosition>> => {
      if (mockMode) {
        const positions = await fetchMockPositions();
        return latestByDevice(positions);
      }
      const positions = await fetchPositions();
      return latestByDevice(positions);
    },
    enabled: true,
    refetchInterval: mockMode ? 1_500 : 2_500,
    staleTime: mockMode ? 1_000 : 2_000,
    retry: 2,
  });
}

/** Reduce un array de posiciones a la más reciente por dispositivo. */
function latestByDevice(positions: TraccarPosition[]): Record<number, TraccarPosition> {
  const latest: Record<number, TraccarPosition> = {};
  for (const p of positions) {
    if (p.latitude == null || p.longitude == null) continue;
    const prev = latest[p.deviceId];
    if (!prev || (p.fixTime ?? '') > (prev.fixTime ?? '')) latest[p.deviceId] = p;
  }
  return latest;
}

/**
 * Posición más reciente del vehículo seleccionado.
 * Polling cada 2.5s (1.5s en modo demo) para alimentar el marcador
 * y la tarjeta de estado en tiempo real.
 */
export function useTraccarPosition(deviceId: number | null, mockMode: boolean) {
  const fleet = useTraccarFleet(mockMode);
  return {
    ...fleet,
    data: deviceId == null ? null : fleet.data?.[deviceId] ?? null,
  };
}
