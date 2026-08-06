'use client';

/**
 * Skeletons animados con dimensiones fijas para evitar
 * Cumulative Layout Shift (CLS) durante la carga.
 */
export function LoadingSkeleton() {
  return (
    <div className="skeleton-dashboard" aria-busy="true" aria-label="Cargando monitor de flota">
      <aside className="skeleton-dashboard__side">
        <div className="skeleton skeleton--select" />
        <div className="skeleton-card">
          <div className="skeleton skeleton--title" />
          <div className="skeleton skeleton--badge" />
          <div className="skeleton skeleton--row" />
          <div className="skeleton skeleton--row" />
          <div className="skeleton skeleton--row" />
          <div className="skeleton skeleton--text" />
        </div>
      </aside>
      <div className="skeleton-map" role="status" aria-label="Cargando mapa del vehículo" />
    </div>
  );
}
