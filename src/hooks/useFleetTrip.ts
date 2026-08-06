'use client';

import { useCallback, useEffect, useRef } from 'react';
import type { TraccarPosition } from '@/types/traccar';

export interface FleetFrame {
  id: number;
  point: [number, number, number];
  heading: number;
}

interface Fix {
  lat: number;
  lng: number;
}

const KM_PER_DEG = 111.32;
const MIN_SEG_MS = 250;
const MAX_SEG_MS = 5000;

function distKm(a: Fix, b: Fix): number {
  return Math.hypot(a.lat - b.lat, a.lng - b.lng) * KM_PER_DEG;
}

function bearingDeg(a: Fix, b: Fix): number {
  const toRad = Math.PI / 180;
  const dLng = (b.lng - a.lng) * toRad;
  const lat1 = a.lat * toRad;
  const lat2 = b.lat * toRad;
  const y = Math.sin(dLng) * Math.cos(lat1);
  const x =
    Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
  return (Math.atan2(y, x) * (180 / Math.PI) + 360) % 360;
}

/**
 * Animación de la flota completa (vista "todos los vehículos").
 *
 * Igual que useVehicleTrip pero para varios vehículos a la vez: cada uno
 * interpola de forma continua entre su fix anterior y el nuevo durante el
 * intervalo del polling, de modo que NUNCA se quedan congelados aunque la
 * posición llegue por saltos (refetch cada 1.5s/2.5s).
 *
 * - Los frames se leen con `getFleetFrames()` (accesor estable por refs),
 *   por lo que el bucle de render del mapa no se reinicia en cada poll.
 */
export function useFleetTrip(
  fleet: { deviceId: number; position: TraccarPosition | null }[],
  enabled = true,
) {
  const framesRef = useRef<FleetFrame[]>([]);
  const positionsRef = useRef(new Map<number, TraccarPosition | null>());
  const segRef = useRef<
    Map<number, { prev: Fix; curr: Fix; start: number; dur: number }>
  >(new Map());
  const lastRef = useRef(performance.now());

  positionsRef.current = new Map(fleet.map((f) => [f.deviceId, f.position]));

  // Al llegar fixes nuevos (cada poll) se actualizan los segmentos [prev→curr].
  useEffect(() => {
    const now = performance.now();
    for (const [id, pos] of positionsRef.current) {
      if (!pos || pos.latitude == null || pos.longitude == null) continue;
      const fix: Fix = { lat: pos.latitude, lng: pos.longitude };
      const seg = segRef.current.get(id);
      if (!seg) {
        segRef.current.set(id, { prev: fix, curr: fix, start: now, dur: MIN_SEG_MS });
        continue;
      }
      // Ignorar fixes casi idénticos (no resetea el tramo en curso).
      if (distKm(seg.curr, fix) < 0.001) continue;
      // Duración según el tiempo transcurrido desde el último fix (polling).
      const gap = Math.min(MAX_SEG_MS, Math.max(MIN_SEG_MS, now - seg.start));
      seg.prev = seg.curr;
      seg.curr = fix;
      seg.start = now;
      seg.dur = gap;
    }
  }, [fleet]);

  // Bucle de interpolación: avanza todos los vehículos en tiempo real.
  useEffect(() => {
    if (!enabled) return;
    let raf = 0;

    const tick = () => {
      const now = performance.now();
      const frames: FleetFrame[] = [];

      for (const [id, seg] of segRef.current) {
        const t = Math.min(1, Math.max(0, (now - seg.start) / seg.dur));
        const lat = seg.prev.lat + (seg.curr.lat - seg.prev.lat) * t;
        const lng = seg.prev.lng + (seg.curr.lng - seg.prev.lng) * t;
        const heading =
          seg.prev.lat === seg.curr.lat && seg.prev.lng === seg.curr.lng
            ? 0
            : bearingDeg(seg.prev, seg.curr);
        frames.push({ id, point: [lng, lat, 0], heading });
      }

      framesRef.current = frames;
      lastRef.current = now;
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [enabled]);

  const getFleetFrames = useCallback(() => framesRef.current, []);

  return { getFleetFrames };
}
