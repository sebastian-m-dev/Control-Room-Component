'use client';

import { useAppStore } from '@/store/useAppStore';
import type { TraccarDevice } from '@/types/traccar';

interface DeviceSelectorProps {
  devices: TraccarDevice[];
  isLoading?: boolean;
  hasError?: boolean;
}

export function DeviceSelector({ devices, isLoading, hasError }: DeviceSelectorProps) {
  const selectedDeviceId = useAppStore((s) => s.selectedDeviceId);
  const setSelectedDeviceId = useAppStore((s) => s.setSelectedDeviceId);
  const showAllVehicles = useAppStore((s) => s.showAllVehicles);
  const setShowAllVehicles = useAppStore((s) => s.setShowAllVehicles);

  const selectValue = showAllVehicles ? 'all' : (selectedDeviceId?.toString() ?? '');

  const handleChange = (value: string) => {
    if (value === 'all') {
      setShowAllVehicles(true);
      setSelectedDeviceId(null);
    } else if (value) {
      setShowAllVehicles(false);
      setSelectedDeviceId(Number(value));
    }
  };

  return (
    <div
      className="field ai-card-3d hidden device-selector-cta"
      role="group"
      aria-labelledby="device-select-label"
      title="Seleccionar vehículo"
    >
      <label className="field__label" id="device-select-label" htmlFor="device-select">
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
            value={selectValue}
            disabled={devices.length === 0}
            onChange={(e) => handleChange(e.target.value)}
            aria-label="Seleccionar vehículo" title="Seleccionar vehículo"
          >
            {devices.length === 0 ? (
              <option value="" disabled>
                No hay vehículos disponibles
              </option>
            ) : (
              <>
                <option value="all">Todos los vehículos</option>
                {devices.map((device) => (
                  <option key={device.id} value={device.id}>
                    {device.name} · {device.status === 'online' ? 'En línea' : 'Sin conexión'}
                  </option>
                ))}
              </>
            )}
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
