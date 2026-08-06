'use client';

import { useAppStore } from '@/store/useAppStore';
import type { TraccarDevice } from '@/types/traccar';

interface DeviceSelectorCtaProps {
  devices: TraccarDevice[];
  isLoading?: boolean;
  hasError?: boolean;
}

export function DeviceSelectorCta({ devices, isLoading, hasError }: DeviceSelectorCtaProps) {
  const selectedDeviceId = useAppStore((s) => s.selectedDeviceId);
  const setSelectedDeviceId = useAppStore((s) => s.setSelectedDeviceId);

  return (
    <div className="field ai-card-3d">
      <label className="field__label" htmlFor="device-select">
        Vehículo
      </label>

      {isLoading ? (
        <div className="skeleton skeleton--select" role="status" aria-label="Cargando vehículos" />
      ) : hasError ? (
        <p className="field__error" role="alert">
          No se pudieron cargar los vehículos.
        </p>
      ) : (
        <div className="select-wrap">
          <select
            id="device-select"
            className="select"
            value={selectedDeviceId ?? ''}
            disabled={devices.length === 0}
            onChange={(e) =>
              setSelectedDeviceId(e.target.value ? Number(e.target.value) : null)
            }
          >
            <option value="" disabled>
              {devices.length === 0 ? 'No hay vehículos disponibles' : 'Selecciona un vehículo…'}
            </option>
            {devices.map((device) => (
              <option key={device.id} value={device.id}>
                {device.name} · {device.status === 'online' ? 'En línea' : 'Sin conexión'}
              </option>
            ))}
          </select>
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="m6 9 6 6 6-6" />
          </svg>
        </div>
      )}
    </div>
  );
}
