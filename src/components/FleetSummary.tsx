'use client';

import type { TraccarDevice, TraccarPosition } from '@/types/traccar';

// ============================================================
// Resumen de la flota: se muestra en la tarjeta lateral cuando el
// mapa está en vista "todos los vehículos". Indica cuántos hay,
// cuántos están en línea y cuántos tienen posición reciente.
// ============================================================

interface FleetSummaryProps {
  fleet: { device: TraccarDevice; position: TraccarPosition | null }[];
  isLoading?: boolean;
}

export function FleetSummary({ fleet, isLoading }: FleetSummaryProps) {
  const total = fleet.length;
  const online = fleet.filter((f) => f.device.status === 'online').length;
  const withPosition = fleet.filter(
    (f) => f.position && f.position.latitude != null && f.position.longitude != null,
  ).length;

  return (
    <article className="status-card fleet-summary" aria-labelledby="fleet-summary-title">
      <header className="status-card__header">
        <div className="status-card__identity">
          <h2 id="fleet-summary-title" className="status-card__title">
            Flota
          </h2>
          <p className="status-card__id">{total} vehículo{total === 1 ? '' : 's'} en el mapa</p>
        </div>
        <span className={`pulse pulse--${online > 0 ? 'online' : 'offline'}`} role="status">
          <span className="pulse__dot ai-status-dot" aria-hidden="true" />
          {online} en línea
        </span>
      </header>

      <dl className="status-card__grid">
        <div className="status-card__item">
          <dt>Vehículos</dt>
          <dd>{isLoading ? '…' : total}</dd>
        </div>
        <div className="status-card__item">
          <dt>En línea</dt>
          <dd>{isLoading ? '…' : online}</dd>
        </div>
        <div className="status-card__item">
          <dt>Con posición</dt>
          <dd>{isLoading ? '…' : withPosition}</dd>
        </div>
        <div className="status-card__item">
          <dt>Sin señal</dt>
          <dd>{isLoading ? '…' : Math.max(0, total - online)}</dd>
        </div>
      </dl>

      <p className="status-card__hint">
        Elige un vehículo en el selector para ver sus datos en detalle.
      </p>
    </article>
  );
}
