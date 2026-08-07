// ============================================================
// Modo Simulación/Demo: garantiza que la app nunca se rompa
// aunque los servidores públicos de Traccar estén caídos.
//
// En lugar de posiciones aleatorias que "vuelan" sobre el mapa,
// cada vehículo genera UNA ruta real por calles usando la Google
// Directions API y avanza por ella (loops de ida y vuelta), de
// modo que el tramo dibujado siga la geometría de las calles.
// Si la Directions API falla (sin key/habilitación), se usa un
// bucle circular determinístico como respaldo.
// ============================================================

import type { TraccarDevice, TraccarPosition } from '@/types/traccar';

interface MockVehicle {
  id: number;
  name: string;
  uniqueId: string;
  status: 'online' | 'offline';
  center: [number, number];
}

export const MOCK_VEHICLES: MockVehicle[] = [
  { id: 1, name: 'Furgón A-401', uniqueId: 'SIM-001', status: 'online', center: [40.4168, -3.7038] },
  { id: 2, name: 'Camión B-207', uniqueId: 'SIM-002', status: 'online', center: [40.4251, -3.6981] },
  { id: 3, name: 'Moto C-118', uniqueId: 'SIM-003', status: 'offline', center: [40.412, -3.71] },
];

interface SimState {
  /** Metros recorridos a lo largo de la ruta. */
  t: number;
  /** Dirección de avance: 1 hacia adelante, -1 de vuelta (ping-pong). */
  dir: number;
  /** Timestamp (ms) del paso anterior para calcular la distancia. */
  last: number;
  speedKnots: number;
}

const state = new Map<number, SimState>();

interface RouteState {
  /** Puntos del polyline como [lng, lat]. */
  points: [number, number][];
  /** Metros acumulados hasta cada punto. */
  cumulative: number[];
  /** Longitud total de la ruta en metros. */
  total: number;
}

/** Cache de rutas por vehículo (una sola petición a Directions por sesión). */
const routeCache = new Map<number, Promise<RouteState | null>>();

// En el cliente se usa la key pública solo para detectar si hay que pedir la
// ruta al proxy (la petición real la hace el servidor con GOOGLE_DIRECTIONS_API_KEY).
// En el servidor se usa la key server-side de Directions (sin referrer).
const GOOGLE_API_KEY =
  process.env.GOOGLE_DIRECTIONS_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';

function getState(vehicle: MockVehicle): SimState {
  let s = state.get(vehicle.id);
  if (!s) {
    s = {
      t: 0,
      dir: 1,
      last: 0,
      speedKnots: 8 + Math.random() * 30,
    };
    state.set(vehicle.id, s);
  }
  return s;
}

/** Número determinístico en [0,1) a partir del id del vehículo. */
function seededUnit(vehicleId: number, salt: number): number {
  const x = Math.sin(vehicleId * 127.1 + salt * 311.7) * 43758.5453123;
  return x - Math.floor(x);
}

/** Desplazamiento determinístico (±d) alrededor del centro del vehículo. */
function offset(vehicleId: number, salt: number, d: number): number {
  return (seededUnit(vehicleId, salt) * 2 - 1) * d;
}

/** Desplazamiento en grados de longitud según la latitud. */
function offsetLng(vehicleId: number, salt: number, d: number, lat: number): number {
  return offset(vehicleId, salt, d) / Math.cos((lat * Math.PI) / 180);
}

/** Distancia aproximada entre dos [lng, lat] en metros (haversine). */
function distMeters(a: [number, number], b: [number, number]): number {
  const toRad = Math.PI / 180;
  const dLat = (b[1] - a[1]) * toRad;
  const dLng = (b[0] - a[0]) * toRad;
  const la1 = a[1] * toRad;
  const la2 = b[1] * toRad;
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2;
  return 6371008.8 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

/** Decodificador del polyline de la Directions API (algoritmo de Google). */
function decodePolyline(encoded: string): [number, number][] {
  const points: [number, number][] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < encoded.length) {
    let b;
    let shift = 0;
    let result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dLat = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
    lat += dLat;

    shift = 0;
    result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dLng = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
    lng += dLng;

    points.push([lng / 1e5, lat / 1e5]);
  }
  return points;
}

function pointsToRoute(points: [number, number][]): RouteState {
  const cumulative: number[] = [0];
  for (let i = 1; i < points.length; i++) {
    cumulative.push(cumulative[i - 1] + distMeters(points[i - 1], points[i]));
  }
  return { points, cumulative, total: cumulative[cumulative.length - 1] };
}

/** Bucle circular determinístico de respaldo si la Directions API no está disponible. */
function buildFallbackRoute(vehicle: MockVehicle): RouteState {
  const points: [number, number][] = [];
  const dLng = 1 / (111320 * Math.cos((vehicle.center[0] * Math.PI) / 180));
  for (let i = 0; i <= 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    const r = 550 * (1 + 0.3 * Math.sin(i * 2.7 + vehicle.id));
    points.push([
      vehicle.center[1] + r * Math.sin(a) * dLng,
      vehicle.center[0] + (r * Math.cos(a)) / 111320,
    ]);
  }
  return pointsToRoute(points);
}

function fetchRoute(vehicle: MockVehicle): Promise<RouteState | null> {
  if (!GOOGLE_API_KEY) return Promise.resolve(null);

  const origin = `${vehicle.center[0] + offset(vehicle.id, 1, 0.012)},${vehicle.center[1] + offsetLng(vehicle.id, 2, 0.018, vehicle.center[0])}`;
  const destination = `${vehicle.center[0] + offset(vehicle.id, 3, 0.012)},${vehicle.center[1] + offsetLng(vehicle.id, 4, 0.018, vehicle.center[0])}`;

  // En el navegador usamos nuestro proxy server-side (los web services de
  // Google no envían cabeceras CORS). En el server llamamos directamente.
  const url =
    typeof window === 'undefined'
      ? 'https://maps.googleapis.com/maps/api/directions/json' +
        `?origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}` +
        '&mode=driving&alternatives=false' +
        `&key=${GOOGLE_API_KEY}`
      : `/api/maps/directions?origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}`;

  return fetch(url)
    .then((res) => res.json())
    .then((json) => {
      const route = json?.routes?.[0];
      if (!route) return null;

      // Concatenar los polylines de cada step (geometría detallada por calle)
      // en lugar del overview_polyline, que suaviza y corta esquinas.
      const encoded = route.legs?.flatMap(
        (leg: { steps?: { polyline?: { points?: string } }[] }) =>
          leg.steps?.map((s: { polyline?: { points?: string } }) => s.polyline?.points) ?? [],
      );
      if (!Array.isArray(encoded) || encoded.length === 0) return null;
      const points: [number, number][] = [];
      for (const chunk of encoded) {
        if (typeof chunk !== 'string' || chunk.length === 0) continue;
        const decoded = decodePolyline(chunk);
        if (points.length > 0 && decoded.length > 0) {
          const a = points[points.length - 1];
          const b = decoded[0];
          if (a[0] !== b[0] || a[1] !== b[1]) points.push(b);
          decoded.shift();
        }
        points.push(...decoded);
      }
      if (points.length < 2) return null;
      return pointsToRoute(points);
    })
    .catch(() => null);
}

function getRoute(vehicle: MockVehicle): Promise<RouteState | null> {
  let cached = routeCache.get(vehicle.id);
  if (!cached) {
    cached = fetchRoute(vehicle).then((route) => route ?? buildFallbackRoute(vehicle));
    routeCache.set(vehicle.id, cached);
  }
  return cached;
}

/** Posición sobre el polyline a t metros desde el inicio. */
function pointAt(route: RouteState, t: number): { lat: number; lng: number; course: number } {
  const { points, cumulative } = route;
  const tt = Math.max(0, Math.min(route.total, t));

  let i = 0;
  while (i < points.length - 2 && cumulative[i + 1] < tt) i++;

  const segStart = cumulative[i];
  const segEnd = cumulative[i + 1];
  const r = segEnd > segStart ? (tt - segStart) / (segEnd - segStart) : 0;

  const a = points[i];
  const b = points[i + 1];
  const lng = a[0] + (b[0] - a[0]) * r;
  const lat = a[1] + (b[1] - a[1]) * r;

  const toRad = Math.PI / 180;
  const dLng = (b[0] - a[0]) * toRad;
  const la1 = a[1] * toRad;
  const la2 = b[1] * toRad;
  const y = Math.sin(dLng) * Math.cos(la1);
  const x = Math.cos(la1) * Math.sin(la2) - Math.sin(la1) * Math.cos(la2) * Math.cos(dLng);
  const course = (Math.atan2(y, x) * (180 / Math.PI) + 360) % 360;

  return { lat, lng, course };
}

export async function fetchMockDevices(): Promise<TraccarDevice[]> {
  const now = Date.now();
  return MOCK_VEHICLES.map((v) => ({
    id: v.id,
    name: v.name,
    uniqueId: v.uniqueId,
    status: v.status,
    lastUpdate:
      v.status === 'online' ? new Date(now).toISOString() : new Date(now - 45 * 60_000).toISOString(),
    attributes: {},
  }));
}

export async function getMockPosition(deviceId: number): Promise<TraccarPosition | null> {
  const vehicle = MOCK_VEHICLES.find((v) => v.id === deviceId);
  if (!vehicle || vehicle.status === 'offline') return null;

  const s = getState(vehicle);
  const route = await getRoute(vehicle);
  if (!route || route.total <= 0) return null;

  const now = Date.now();
  // Distancia recorrida desde el paso anterior a velocidad actual.
  const speedKnots = Math.max(2, Math.min(65, s.speedKnots + (Math.random() - 0.5) * 4));
  if (s.last) {
    const dtSec = (now - s.last) / 1000;
    s.t += s.dir * speedKnots * 0.514444 * dtSec;

    // Ping-pong en los extremos de la ruta: avanza y luego regresa,
    // así el vehículo siempre circula por calles sin teleportes.
    if (s.t >= route.total) {
      s.t = route.total;
      s.dir = -1;
    } else if (s.t <= 0) {
      s.t = 0;
      s.dir = 1;
    }
  }
  s.last = now;
  s.speedKnots = speedKnots;

  const { lat, lng, course } = pointAt(route, s.t);

  const nowIso = new Date(now).toISOString();
  return {
    id: now,
    deviceId,
    protocol: 'demo',
    serverTime: nowIso,
    deviceTime: nowIso,
    fixTime: nowIso,
    valid: true,
    latitude: lat,
    longitude: lng,
    speed: speedKnots,
    course,
    altitude: Math.round(600 + Math.random() * 40),
    accuracy: 6,
    attributes: { batteryLevel: Math.round(55 + Math.random() * 40) },
  };
}

/** Posiciones simuladas de todos los vehículos online (para sesiones simuladas). */
export async function fetchMockPositions(): Promise<TraccarPosition[]> {
  const positions: TraccarPosition[] = [];
  for (const vehicle of MOCK_VEHICLES) {
    const position = await getMockPosition(vehicle.id);
    if (position) positions.push(position);
  }
  return positions;
}
