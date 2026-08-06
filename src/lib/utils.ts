// ============================================================
// Utilidades de formateo y conversión
// ============================================================

const HTML_ESCAPE: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (c) => HTML_ESCAPE[c] ?? c);
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** Traccar devuelve la velocidad en nudos. Conversión a km/h: knots * 1.852. */
export function knotsToKmh(knots: number | null | undefined): number | null {
  if (knots == null || Number.isNaN(knots)) return null;
  return Math.round(knots * 1.852);
}

const CARDINALS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'] as const;

/** Convierte un rumbo en grados a su punto cardinal (ej: 180° -> 'S'). */
export function courseToCardinal(course: number | null | undefined): string {
  if (course == null || Number.isNaN(course)) return '—';
  const normalized = ((course % 360) + 360) % 360;
  const index = Math.round(normalized / 45) % 8;
  return CARDINALS[index];
}

/** Tiempo relativo legible para humanos (ej: "Hace 10 s"). */
export function formatRelativeTime(
  dateInput: string | Date | null | undefined,
  now = Date.now(),
): string {
  if (!dateInput) return '—';
  const date = dateInput instanceof Date ? dateInput : new Date(dateInput);
  if (Number.isNaN(date.getTime())) return '—';

  const diffSeconds = Math.max(0, Math.floor((now - date.getTime()) / 1000));

  if (diffSeconds < 10) return 'Hace unos segundos';
  if (diffSeconds < 60) return `Hace ${diffSeconds} s`;
  const minutes = Math.floor(diffSeconds / 60);
  if (minutes < 60) return `Hace ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Hace ${hours} h`;

  return date.toLocaleDateString('es-ES', {
    day: '2-digit',
    month: 'short',
  });
}

/** Hora de reloj (ej: "14:32:01"). */
export function formatClockTime(dateInput: string | Date | null | undefined): string {
  if (!dateInput) return '—';
  const date = dateInput instanceof Date ? dateInput : new Date(dateInput);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleTimeString('es-ES', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}
