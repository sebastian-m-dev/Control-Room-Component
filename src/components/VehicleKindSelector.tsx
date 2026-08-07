'use client';

import { useRef } from 'react';
import Image from 'next/image';
import { useAppStore } from '@/store/useAppStore';
import { VEHICLE_KINDS } from '@/lib/vehicle';
import type { VehicleKind } from '@/lib/vehicle';

// ============================================================
// Selector del tipo de vehículo para el dispositivo seleccionado.
// Traccar no expone una lista cerrada de categorías (es texto libre),
// así que permitimos elegir manualmente el icono por dispositivo.
// El valor queda persistido en el store (localStorage) y tiene
// prioridad sobre la heurística por nombre/categoría.
// ============================================================

const KIND_LABELS: Record<VehicleKind, string> = {
  car: 'Auto',
  van: 'Furgón',
  truck: 'Camión',
  motorcycle: 'Moto',
};

interface VehicleKindSelectorProps {
  deviceId: number;
  deviceName: string;
}

export function VehicleKindSelector({ deviceId, deviceName }: VehicleKindSelectorProps) {
  const selected = useAppStore((s) => s.vehicleKinds[deviceId]);
  const setVehicleKind = useAppStore((s) => s.setVehicleKind);
  const buttonsRef = useRef<(HTMLButtonElement | null)[]>([]);

  // Navegación por teclado del radiogroup (APG): flechas mueven el foco y
  // la selección; Home/End van al primer/último tipo.
  const handleKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>, kind: VehicleKind) => {
    const index = VEHICLE_KINDS.indexOf(kind);
    if (index === -1) return;

    const select = (next: VehicleKind) => {
      setVehicleKind(deviceId, next);
      buttonsRef.current[VEHICLE_KINDS.indexOf(next)]?.focus();
    };

    switch (event.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        event.preventDefault();
        select(VEHICLE_KINDS[(index + 1) % VEHICLE_KINDS.length]);
        break;
      case 'ArrowLeft':
      case 'ArrowUp':
        event.preventDefault();
        select(VEHICLE_KINDS[(index - 1 + VEHICLE_KINDS.length) % VEHICLE_KINDS.length]);
        break;
      case 'Home':
        event.preventDefault();
        select(VEHICLE_KINDS[0]);
        break;
      case 'End':
        event.preventDefault();
        select(VEHICLE_KINDS[VEHICLE_KINDS.length - 1]);
        break;
    }
  };

  return (
    <div className="field ai-card-3d hidden vehicle-kind-selector">
      <span className="field__label" id="vehicle-kind-label">
        Tipo de vehículo
      </span>

      <div className="vehicle-kind-selector__options" role="radiogroup" aria-labelledby="vehicle-kind-label">
        {VEHICLE_KINDS.map((kind) => {
          const active = selected === kind;
          return (
            <button
              key={kind}
              ref={(el) => {
                buttonsRef.current[VEHICLE_KINDS.indexOf(kind)] = el;
              }}
              type="button"
              role="radio"
              aria-checked={active}
              className={`vehicle-kind-selector__option${active ? ' is-active' : ''}`}
              title={`Mostrar ${deviceName} como ${KIND_LABELS[kind]}`}
              onClick={() => setVehicleKind(deviceId, kind)}
              onKeyDown={(e) => handleKeyDown(e, kind)}
            >
              <Image
                src={`/icons/icon-${kind}-thumb.png`}
                alt=""
                width={24}
                height={24}
                style={{ objectFit: 'contain' }}
              />
              <span>{KIND_LABELS[kind]}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
