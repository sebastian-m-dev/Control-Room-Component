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
  size?: number;
}

export function VehicleIcon({ device, size = 80 }: VehicleIconProps) {
  const kindOverride = useAppStore((s) => s.vehicleKinds[device.id]);
  const kind = resolveVehicleKind(device, kindOverride);
  const online = device.status === 'online';

  return (
    <span
      className={`vehicle-icon vehicle-icon--${kind}${online ? '' : ' vehicle-icon--offline'}`}
      role="img"
      aria-label={`Icono del vehículo ${device.name} (${kind})`}
      style={{ width: size, height: size }}
    >
      <Image
        src={getVehicleThumbUrl(device)}
        alt=""
        width={size}
        height={size}
        style={{ objectFit: 'contain' }}
      />
    </span>
  );
}
