'use client';

import { useCallback, useEffect, useRef } from 'react';
import { TripBuilder } from '@/lib/trip-builder';
import type { TraccarPosition } from '@/types/traccar';

export interface VehicleFrame {
  point: [number, number, number];
  heading: number;
}

interface TripFix {
  lat: number;
  lng: number;
}

const KM_PER_DEG = 111.32;
const SNAP_KM = 40;
const MAX_FIXES = 200;

// Parámetros de conducción iguales al ejemplo "google-3d" de deck.gl
const TRIP_SPEED = 10; // m/s
const TURN_SPEED = 45; // grados/s
const CLOCK_RATE = 1.2;

// Límites del intervalo de interpolación entre fixes (evita que un poll
// retardado estire el tramo de forma poco realista).
const MIN_SEG_MS = 250;
const MAX_SEG_MS = 5000;

function distKm(a: TripFix, b: TripFix): number {
  return Math.hypot(a.lat - b.lat, a.lng - b.lng) * KM_PER_DEG;
}

function bearingDeg(a: TripFix, b: TripFix): number {
  const toRad = Math.PI / 180;
  const dLng = (b.lng - a.lng) * toRad;
  const lat1 = a.lat * toRad;
  const lat2 = b.lat * toRad;
  const y = Math.sin(dLng) * Math.cos(lat1);
  const x =
    Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
  return (Math.atan2(y, x) * (180 / Math.PI) + 360) % 360;
}

function turnAngle(startHeading: number, endHeading: number): number {
  let turn = endHeading - startHeading;
  if (turn < -180) turn += 360;
  if (turn > 180) turn -= 360;
  return turn;
}

/** Bucle irregular alrededor de un punto para animar cuando aún no hay ruta real. */
function buildDemoLoop(lng: number, lat: number, n = 10, baseR = 550): [number, number][] {
  const pts: [number, number][] = [];
  const dLngScale = 1 / (111320 * Math.cos((lat * Math.PI) / 180));
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const r = baseR * (1 + 0.25 * Math.sin(i * 2.7));
    pts.push([lng + r * Math.sin(a) * dLngScale, lat + (r * Math.cos(a)) / 111320]);
  }
  return pts;
}

/**
 * Conducción continua: el camión recorre el tramo entre cada par de fixes
 * reales interpolando linealmente durante el intervalo del polling, de modo
 * que NUNCA se detiene mientras llegan datos (sin paradas cada segundo ni
 * saltos). Cuando aún no hay ruta real usa el loop de demostración.
 *
 * - La traza (getPath) es la lista append-only de fixes reales.
 * - getFrame/getPath son accesores estables (refs, no estado de React), por lo
 *   que el bucle de render del mapa no se reinicia en cada poll.
 */
export function useVehicleTrip(position: TraccarPosition | null) {
  const frameRef = useRef<VehicleFrame | null>(null);
  const fixesRef = useRef<TripFix[]>([]);
  const positionRef = useRef<TraccarPosition | null>(position);
  const deviceRef = useRef<number | null>(position?.deviceId ?? null);

  // Estado del camión (animado) + segmento actual [prevFix → currFix]
  const animRef = useRef<{ lat: number; lng: number; heading: number } | null>(null);
  const prevRef = useRef<TripFix | null>(null);
  const currRef = useRef<TripFix | null>(null);
  const segStartRef = useRef(0);
  const segDurRef = useRef(MIN_SEG_MS);
  const lastFixArrivalRef = useRef(0);

  // Demo loop (solo hasta que llegan ≥2 fixes reales)
  const demoLoopRef = useRef<{ lng: number; lat: number; trip: TripBuilder } | null>(null);
  const demoClockRef = useRef(0);
  const demoLastRef = useRef(performance.now());

  const lastRef = useRef(performance.now());

  positionRef.current = position;

  // Al cambiar de vehículo se reinicia la trayectoria
  useEffect(() => {
    const id = position?.deviceId ?? null;
    if (id !== deviceRef.current) {
      deviceRef.current = id;
      fixesRef.current = [];
      animRef.current = null;
      prevRef.current = null;
      currRef.current = null;
      demoLoopRef.current = null;
      demoClockRef.current = 0;
      frameRef.current = null;
    }
  }, [position?.deviceId]);

  // Acumula fixes reales y arma el segmento de interpolación continuo.
  // prevFix se ancla a la posición animada actual → sin saltos al llegar data.
  useEffect(() => {
    if (!position || position.latitude == null || position.longitude == null) return;
    const fix: TripFix = { lat: position.latitude, lng: position.longitude };
    const fixes = fixesRef.current;
    const last = fixes[fixes.length - 1];

    if (last && distKm(last, fix) < 0.001) return;
    if (last && distKm(last, fix) > SNAP_KM) fixes.length = 0;

    fixes.push(fix);
    if (fixes.length > MAX_FIXES) fixes.shift();

    const now = performance.now();
    const gap = lastFixArrivalRef.current ? now - lastFixArrivalRef.current : MIN_SEG_MS;
    lastFixArrivalRef.current = now;

    // Ancla el inicio del tramo en la posición animada (o en el fix anterior),
    // así el camión continúa desde donde está sin teletransportarse.
    const anim = animRef.current;
    prevRef.current = anim
      ? { lat: anim.lat, lng: anim.lng }
      : fixes.length >= 2
        ? fixes[fixes.length - 2]
        : fix;
    currRef.current = fix;
    segStartRef.current = now;
    segDurRef.current = Math.min(MAX_SEG_MS, Math.max(MIN_SEG_MS, gap));
  }, [position?.latitude, position?.longitude]);

  // Bucle de animación: interpola el segmento [prevFix → currFix] en tiempo real.
  useEffect(() => {
    let raf = 0;

    const tick = () => {
      const now = performance.now();
      const dt = Math.min((now - lastRef.current) / 1000, 0.1);
      lastRef.current = now;

      const fixes = fixesRef.current;
      const pos = positionRef.current;
      const curr = currRef.current;
      const prev = prevRef.current;

      let frame: VehicleFrame | null = null;

      if (fixes.length >= 2 && prev && curr) {
        // --- Modo real: interpola entre fixes ---
        const t = Math.min(1, Math.max(0, (now - segStartRef.current) / segDurRef.current));
        const anim = animRef.current ?? { lat: prev.lat, lng: prev.lng, heading: 0 };
        anim.lat = prev.lat + (curr.lat - prev.lat) * t;
        anim.lng = prev.lng + (curr.lng - prev.lng) * t;

        // Giro suave hacia el rumbo del tramo
        const targetHeading = bearingDeg(prev, curr);
        const maxTurn = TURN_SPEED * dt;
        const turn = turnAngle(anim.heading, targetHeading);
        if (Math.abs(turn) > maxTurn) {
          anim.heading = (anim.heading + Math.sign(turn) * maxTurn + 360) % 360;
        } else {
          anim.heading = targetHeading;
        }

        animRef.current = anim;
        frame = { point: [anim.lng, anim.lat, 0], heading: anim.heading };
      } else if (pos?.latitude != null && pos.longitude != null) {
        // --- Modo demo: loop continuo mientras no hay ruta real ---
        if (!demoLoopRef.current) {
          demoLoopRef.current = {
            lng: pos.longitude,
            lat: pos.latitude,
            trip: new TripBuilder({
              waypoints: buildDemoLoop(pos.longitude, pos.latitude),
              speed: TRIP_SPEED,
              turnSpeed: TURN_SPEED,
              loop: true,
            }),
          };
          demoClockRef.current = 0;
        }
        demoClockRef.current += ((now - demoLastRef.current) / 1000) * CLOCK_RATE;
        const demo = demoLoopRef.current;
        const f = demo.trip.getFrame(demoClockRef.current);
        frame = { point: [f.point[0], f.point[1], 0], heading: f.heading };
      }

      demoLastRef.current = now;
      frameRef.current = frame;
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const getFrame = useCallback(() => frameRef.current, []);

  // Traza visible: fixes reales, o el loop de demostración si aún no hay ruta.
  const getPath = useCallback((): [number, number][] => {
    const fixes = fixesRef.current;
    if (fixes.length >= 2) return fixes.map((f) => [f.lng, f.lat] as [number, number]);
    const demo = demoLoopRef.current;
    return demo ? demo.trip.keyframes.map((k) => k.point) : [];
  }, []);

  return { getFrame, getPath };
}
