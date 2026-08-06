'use client';

import { useEffect, useState } from 'react';

import { AlertLightbox } from './AlertLightbox';
import type { TraccarDevice, TraccarPosition } from '@/types/traccar';

interface AlertBannerProps {
  device: TraccarDevice;
  position: TraccarPosition | null;
  stale: boolean;
}

export function AlertBanner({ device, position, stale }: AlertBannerProps) {
  const isOnline = device.status === 'online';
  const hasPosition = position != null;

  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (isOnline && !stale) {
      setDismissed(false);
    }
  }, [isOnline, stale]);

  if (isOnline && !stale) return null;
  if (dismissed) return null;

  const title = !isOnline ? 'Vehículo sin conexión' : 'Datos desactualizados';
  const body = !isOnline
    ? `El vehículo ${device.name} no está reportando posición. Verifica el equipo o el estado de la red.`
    : !hasPosition
      ? 'Aún no se ha recibido ninguna posición para este vehículo.'
      : 'La última posición recibida tiene más de un minuto. Esperando nueva actualización…';

  return (
    <AlertLightbox title={title} body={body} onClose={() => setDismissed(true)} />
  );
}
