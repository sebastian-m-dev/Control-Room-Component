'use client';

import { useMemo } from 'react';
import type { TraccarDevice, TraccarPosition } from '@/types/traccar';
import { knotsToKmh, courseToCardinal, formatRelativeTime, formatClockTime } from '@/lib/utils';
import { useNow } from '@/hooks/useNow';
import { Odometer } from './Odometer';
import { VehicleIcon } from './VehicleIcon';

function SoftFade({ text }: { text: string }) {
  return (
    <span key={text} className="soft-fade">
      {text}
    </span>
  );
}

interface StatusCardProps {
  device: TraccarDevice;
  position: TraccarPosition | null;
  positionLoading: boolean;
}

export function StatusCard({ device, position, positionLoading }: StatusCardProps) {
  const now = useNow(1000);
  const online = device.status === 'online';

  const speed = knotsToKmh(position?.speed);
  const course = position?.course ?? null;
  const fixTime = position?.fixTime ?? device.lastUpdate ?? null;
  const battery = (() => {
    const raw =
      position?.attributes?.batteryLevel ?? device.attributes?.batteryLevel ?? null;
    return typeof raw === 'number' ? raw : null;
  })();
  const address = typeof position?.address === 'string' ? position.address : null;

  // Anuncio conciso para lectores de pantalla (aria-live polite).
  // Solo cambia con valores significativos para no saturar al lector.
  const announcement = useMemo(() => {
    const kmh = speed == null ? 'desconocida' : `${speed} kilómetros por hora`;
    return `Vehículo ${device.name}, ${online ? 'en línea' : 'sin conexión'}, velocidad ${kmh}, rumbo ${course == null ? 'desconocido' : `${Math.round(course)} grados`
      }.`;
  }, [device.name, online, speed, course]);

  return (
    <article className="status-card" aria-labelledby="status-card-title">
      <header className="status-card__header">
        <div className="status-card__identity">
          <VehicleIcon device={device} size={56} />
          <div>
            <h2 id="status-card-title" className="status-card__title">
              {device.name}
            </h2>
            <p className="status-card__id">ID {device.uniqueId}</p>
          </div>
        </div>
        <span className={`pulse pulse--${online ? 'online' : 'offline'}`} role="status">
          <span className="pulse__dot ai-status-dot" aria-hidden="true" />
          {online ? 'En línea' : 'Sin conexión'}
        </span>
      </header>

      {address && (
        <p className="status-card__address">
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z" />
            <circle cx="12" cy="10" r="3" />
          </svg>
          {address}
        </p>
      )}

      <dl className="status-card__grid">
        <div className="status-card__item">
          <dt>Velocidad</dt>
          <dd>
            <Odometer value={speed} />
            <span className="status-card__unit">km/h</span>
          </dd>
        </div>

        <div className="status-card__item">
          <dt>Rumbo</dt>
          <dd>
            <Odometer value={course == null ? null : Math.round(course)} />
            <span>
              ° · {course == null ? '—' : courseToCardinal(course)}
            </span>
          </dd>
        </div>

        <div className="status-card__item">
          <dt>Actualización</dt>
          <dd>{positionLoading ? '…' : <SoftFade text={formatRelativeTime(fixTime, now)} />}</dd>
        </div>

        <div className="status-card__item">
          <dt>Último fix</dt>
          <dd>{positionLoading ? '…' : <SoftFade text={formatClockTime(fixTime)} />}</dd>
        </div>

        <div className="status-card__item">
          <dt>Batería</dt>
          <dd>
            <Odometer value={battery} />
            {battery == null ? null : <span className="status-card__unit">%</span>}
          </dd>
        </div>
      </dl>

      <p className="sr-only" role="status" aria-live="polite">
        {announcement}
      </p>
    </article>
  );
}
