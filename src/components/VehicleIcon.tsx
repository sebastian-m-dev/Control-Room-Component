'use client';

import type { TraccarDevice } from '@/types/traccar';
import { resolveVehicleKind } from '@/lib/vehicle';
import { getVehicleThumbUrl } from '@/lib/vehicle';
import { useAppStore } from '@/store/useAppStore';
import Image from 'next/image';

// ============================================================
// Avatar del vehículo en la card (StatusCard).
// Muestra la variante `-thumb` del PNG de su categoría dentro
// del contenedor `vehicle-icon` (fondo y color por tipo).
// El tipo manual elegido por el usuario (si existe) tiene prioridad.
// ============================================================

interface VehicleIconProps {
  device: TraccarDevice;
  /** Ancho de salida en px; la altura escala de forma relativa. */
  width?: number;
}

export function VehicleIcon({ device, width = 100 }: VehicleIconProps) {
  const kindOverride = useAppStore((s) => s.vehicleKinds[device.id]);
  const kind = resolveVehicleKind(device, kindOverride);
  const online = device.status === 'online';

  return (
    <Image
      src={getVehicleThumbUrl(device)}
      className='thumb-img-vehicle'
      alt=""
      width={100}
      height={100}
      style={{ objectFit: 'contain', width: `${width}%`, height: 'auto' }}
    />
  );
}
