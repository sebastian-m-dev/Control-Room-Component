// ============================================================
// Tipos de la API pública de Traccar
// Documentación: https://www.traccar.org/api-reference/
// ============================================================

export interface TraccarDevice {
  id: number;
  name: string;
  uniqueId: string;
  status: 'online' | 'offline' | 'unknown' | string;
  lastUpdate?: string | null;
  positionId?: number;
  groupId?: number;
  phone?: string;
  model?: string;
  contact?: string;
  category?: string;
  disabled?: boolean;
  attributes?: Record<string, unknown>;
}

export interface TraccarPosition {
  id: number;
  deviceId: number;
  protocol?: string;
  serverTime?: string | null;
  deviceTime?: string | null;
  fixTime?: string | null;
  valid?: boolean;
  latitude: number | null;
  longitude: number | null;
  /** Velocidad en nudos (knots). Convertir a km/h con `speed * 1.852`. */
  speed?: number;
  /** Rumbo en grados (0-359, sentido horario desde el norte). */
  course?: number;
  altitude?: number;
  accuracy?: number;
  address?: string;
  attributes?: Record<string, unknown>;
}

export interface SessionUser {
  id: number;
  name: string;
  login: string;
  email?: string;
  administrator?: boolean;
  readonly?: boolean;
}
