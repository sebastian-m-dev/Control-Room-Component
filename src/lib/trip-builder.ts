// Port del TripBuilder del ejemplo "google-3d" de deck.gl (9.3-release).
// Convierte una lista de waypoints en keyframes con tiempo de recorrido
// (velocidad y giros constantes) y permite interpolar un frame en cualquier
// instante, en bucle si se indica.

export interface TripKeyframe {
  /** [lng, lat] */
  point: [number, number];
  heading?: number;
  time: number;
}

export interface TripFrame {
  /** [lng, lat] */
  point: [number, number];
  heading: number;
}

interface TripBuilderOptions {
  waypoints: [number, number][];
  speed?: number; // m/s
  turnSpeed?: number; // grados/s
  loop?: boolean;
}

/** Distancia de rumbo (rhumb) en km. */
function rhumbDistanceKm(a: [number, number], b: [number, number]): number {
  const toRad = Math.PI / 180;
  const lat1 = a[1] * toRad;
  const lat2 = b[1] * toRad;
  const dLat = (b[1] - a[1]) * toRad;
  const dLng = (b[0] - a[0]) * toRad;
  const m = Math.cos((lat1 + lat2) / 2);
  return Math.sqrt(dLat * dLat + (dLng * m) * (dLng * m)) * 6371.0088;
}

/** Rumbo de rumbo (rhumb) en grados desde el norte. */
function rhumbBearing(a: [number, number], b: [number, number]): number {
  const toRad = Math.PI / 180;
  const toDeg = 180 / Math.PI;
  const dLng = (b[0] - a[0]) * toRad;
  const lat1 = a[1] * toRad;
  const lat2 = b[1] * toRad;
  const y = Math.sin(dLng) * Math.cos(lat1);
  const x =
    Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
  return (toDeg * Math.atan2(y, x) + 360) % 360;
}

export class TripBuilder {
  keyframes: TripKeyframe[] = [];
  totalTime = 0;

  private speed: number;
  private turnSpeed: number;
  private loop: boolean;

  constructor({ waypoints, speed = 10, turnSpeed = 45, loop = false }: TripBuilderOptions) {
    this.speed = speed;
    this.turnSpeed = turnSpeed;
    this.loop = loop;

    for (const p of waypoints) {
      this._moveTo(p);
    }
    if (loop && waypoints.length > 2) {
      this._moveTo(waypoints[0]);
      this._turnTo(this.keyframes[0].heading ?? 0);
    }
  }

  private _moveTo(point: [number, number]): void {
    if (this.keyframes.length === 0) {
      this.keyframes.push({ point, time: 0 });
      return;
    }

    const prev = this.keyframes[this.keyframes.length - 1];
    const distance = rhumbDistanceKm(prev.point, point) * 1000;
    const heading = rhumbBearing(prev.point, point);

    if (distance < 0.1) return;
    if (prev.heading === undefined) {
      prev.heading = heading;
    } else {
      this._turnTo(heading);
    }

    this.totalTime += distance / this.speed;
    this.keyframes.push({ point, heading, time: this.totalTime });
  }

  private _turnTo(heading: number): void {
    const prev = this.keyframes[this.keyframes.length - 1];
    const angle = Math.abs(getTurnAngle(prev.heading ?? heading, heading));
    if (angle > 0) {
      this.totalTime += angle / this.turnSpeed;
      this.keyframes.push({ point: prev.point, heading, time: this.totalTime });
    }
  }

  getFrame(timestamp: number): TripFrame {
    if (this.keyframes.length === 0) return { point: [0, 0], heading: 0 };
    if (this.keyframes.length === 1) {
      return { point: this.keyframes[0].point, heading: this.keyframes[0].heading ?? 0 };
    }

    const total = this.totalTime || 1;
    const t = this.loop ? timestamp % total : Math.min(timestamp, total);

    let i = this.keyframes.findIndex((s) => s.time >= t);
    if (i < 0) i = this.keyframes.length - 1;
    const startState = this.keyframes[Math.max(i - 1, 0)];
    const endState = this.keyframes[i];
    const seg = Math.max(endState.time - startState.time, 0.001);
    const r = Math.min(1, Math.max(0, (t - startState.time) / seg));

    const startHeading = startState.heading ?? 0;
    const endHeading = endState.heading ?? startHeading;
    return {
      point: [
        startState.point[0] * (1 - r) + endState.point[0] * r,
        startState.point[1] * (1 - r) + endState.point[1] * r,
      ],
      heading: startHeading + getTurnAngle(startHeading, endHeading) * r,
    };
  }
}

function getTurnAngle(startHeading: number, endHeading: number): number {
  let turnAngle = endHeading - startHeading;
  if (turnAngle < -180) turnAngle += 360;
  if (turnAngle > 180) turnAngle -= 360;
  return turnAngle;
}
