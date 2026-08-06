import type { TraccarDevice } from '@/types/traccar';

export type VehicleKind = 'car' | 'van' | 'truck' | 'motorcycle';

export const VEHICLE_KINDS: readonly VehicleKind[] = ['car', 'van', 'truck', 'motorcycle'];

// ============================================================
// Resolución del tipo de vehículo a partir de los datos de Traccar.
// Compartida entre la UI (VehicleIcon) y el mapa 2D (IconLayer).
// - `override`: tipo elegido manualmente por el usuario (per dispositivo).
//   Tiene prioridad sobre la heurística por nombre/categoría, que solo
//   se usa cuando no hay override (p. ej. dispositivos sin categoría en
//   Traccar, como los registrados desde la app Traccar Client).
// ============================================================

export function resolveVehicleKind(
  device: TraccarDevice | null | undefined,
  override?: VehicleKind,
): VehicleKind {
  if (override && VEHICLE_KINDS.includes(override)) return override;
  if (!device) return 'car';
  const haystack = `${device.category ?? ''} ${device.model ?? ''} ${device.name}`
    .toLowerCase()
    // Normaliza diacríticos (á→a, ó→o, …) para que "camión" y "furgón"
    // coincidan con los patrones (camion|furgon).
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  if (/(camion|truck|lorry|articulado|semirremolque)/.test(haystack)) return 'truck';
  if (/(furgon|van|delivery|panel|reparto)/.test(haystack)) return 'van';
  if (/(moto|motorcycle|scooter|bike)/.test(haystack)) return 'motorcycle';
  return 'car';
}

// ============================================================
// Iconos de vehículo (PNG en /public/icons).
// - `icon-<kind>.png`        -> pin del vehículo en el mapa (IconLayer).
// - `icon-<kind>-thumb.png`  -> avatar en la card (VehicleIcon).
// Cada categoría apunta a su propio asset; si se reemplazan los
// PNG a nivel visual, el cambio se refleja sin tocar código.
// ============================================================

const ICON_BASE_PATH = '/icons';

export function getVehicleIconUrl(
  device: TraccarDevice | null | undefined,
  override?: VehicleKind,
): string {
  return `${ICON_BASE_PATH}/icon-${resolveVehicleKind(device, override)}.png`;
}

export function getVehicleThumbUrl(
  device: TraccarDevice | null | undefined,
  override?: VehicleKind,
): string {
  return `${ICON_BASE_PATH}/icon-${resolveVehicleKind(device, override)}-thumb.png`;
}
