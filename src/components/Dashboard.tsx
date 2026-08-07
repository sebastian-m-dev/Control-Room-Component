'use client';

import { useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useAppStore } from '@/store/useAppStore';
import { useTraccarSession, useTraccarDevices } from '@/hooks/useTraccarDevices';
import { useTraccarFleet } from '@/hooks/useTraccarPosition';
import { isUnauthorizedError } from '@/lib/traccar';
import { Header } from './Header';
import { DeviceSelector } from './DeviceSelector';
import { StatusCard } from './StatusCard';
import { FleetSummary } from './FleetSummary';
import { LoadingSkeleton } from './LoadingSkeleton';
import { ErrorState } from './ErrorState';
import { AlertBanner } from './AlertBanner';
import { DemoNotice } from './DemoNotice';
import { LoginView } from './LoginView';
import { VehicleKindSelector } from './VehicleKindSelector';

// Leaflet solo se carga en el cliente para evitar errores de SSR
const MapView = dynamic(() => import('./MapView').then((m) => m.MapView), {
  ssr: false,
  loading: () => (
    <div className="skeleton-map" role="status" aria-label="Cargando mapa del vehículo" />
  ),
});

export function Dashboard() {
  const mockMode = useAppStore((s) => s.mockMode);
  const setMockMode = useAppStore((s) => s.setMockMode);
  const loggedOut = useAppStore((s) => s.loggedOut);
  const setLoggedOut = useAppStore((s) => s.setLoggedOut);
  const selectedDeviceId = useAppStore((s) => s.selectedDeviceId);
  const setSelectedDeviceId = useAppStore((s) => s.setSelectedDeviceId);
  const showAllVehicles = useAppStore((s) => s.showAllVehicles);
  const setShowAllVehicles = useAppStore((s) => s.setShowAllVehicles);

  // Activar el Modo Demo también debe desbloquear la vista (quitar loggedOut),
  // si no, tras un logout la pantalla de login no desaparece nunca.
  const enableDemo = () => {
    setLoggedOut(false);
    setMockMode(true);
  };

  // Click en un vehículo del modo flota → vista individual de ese vehículo.
  const selectVehicle = (id: number) => {
    setSelectedDeviceId(id);
    setShowAllVehicles(false);
  };

  const session = useTraccarSession(mockMode);
  const devices = useTraccarDevices(mockMode);
  const deviceList = devices.data ?? [];
  const fleet = useTraccarFleet(mockMode);
  const position = fleet.data?.[selectedDeviceId ?? -1] ?? null;

  // Selección automática del primer vehículo en línea cuando la lista está
  // lista. Solo en vista individual: en modo flota no hay vehículo marcado.
  useEffect(() => {
    if (showAllVehicles) return;
    if (deviceList.length === 0) return;
    const exists = deviceList.some((d) => d.id === selectedDeviceId);
    if (!exists) {
      const next = deviceList.find((d) => d.status === 'online') ?? deviceList[0];
      setSelectedDeviceId(next.id);
    }
  }, [deviceList, selectedDeviceId, setSelectedDeviceId, showAllVehicles]);

  const selectedDevice = deviceList.find((d) => d.id === selectedDeviceId) ?? null;

  // Sin sesión válida o sesión cerrada: mostrar la vista de login
  if ((!mockMode && session.isError) || loggedOut) {
    return (
      <div className="dashboard-state login-screen">
        <LoginView onEnableDemo={enableDemo} />
      </div>
    );
  }

  // Sesión expirada durante el uso: volver a login
  if (!mockMode && devices.isError && isUnauthorizedError(devices.error)) {
    return (
      <div className="dashboard-state login-screen">
        <LoginView onEnableDemo={enableDemo} />
      </div>
    );
  }

  // Error de conexión / carga de dispositivos
  if (!mockMode && devices.isError) {
    return (
      <div className="dashboard-state">
        <ErrorState
          kind="connection"
          message={devices.error?.message}
          onRetry={() => {
            session.refetch();
            devices.refetch();
          }}
          onEnableDemo={enableDemo}
        />
      </div>
    );
  }

  // Carga inicial (autenticando o descargando dispositivos)
  if ((!mockMode && session.isPending) || (devices.isPending && !devices.isError)) {
    return <LoadingSkeleton />;
  }

  const stale =
    !showAllVehicles &&
    selectedDevice?.status === 'online' &&
    !!selectedDevice.lastUpdate &&
    Date.now() - new Date(selectedDevice.lastUpdate).getTime() > 90_000;

  const fleetEntries = deviceList.map((d) => ({
    device: d,
    position: fleet.data?.[d.id] ?? null,
  }));

  return (
    <div className="dashboard">
      <div className="dashboard__main">
        {fleet.isError && (
          <div className="dashboard__toast">
            <ErrorState kind="position" message={fleet.error?.message} onRetry={() => fleet.refetch()} />
          </div>
        )}

        <MapView
          device={selectedDevice}
          position={showAllVehicles ? null : position}
          positionLoading={fleet.isPending || fleet.isFetching}
          showAll={showAllVehicles}
          fleet={fleetEntries}
          onSelectVehicle={selectVehicle}
        />

        {fleet.isPending && !fleet.data && (
          <div
            className="skeleton-map-overlay"
            role="status"
            aria-label="Esperando la posición de los vehículos"
          />
        )}
      </div>
      <Header />
      <DeviceSelector
        devices={deviceList}
        isLoading={devices.isPending}
        hasError={devices.isError}
      />
      <aside className="dashboard__controls">
        {mockMode && <DemoNotice />}

        {showAllVehicles ? (
          <FleetSummary fleet={fleetEntries} isLoading={fleet.isPending || fleet.isFetching} />
        ) : (
          <>
            {selectedDevice && (
              <AlertBanner device={selectedDevice} position={position} stale={stale} />
            )}

            {selectedDevice && <VehicleKindSelector deviceId={selectedDevice.id} deviceName={selectedDevice.name} />}

            {selectedDevice ? (
              <StatusCard
                key={selectedDevice.id}
                device={selectedDevice}
                position={position}
                positionLoading={fleet.isPending || fleet.isFetching}
              />
            ) : (
              <div className="empty-state" role="status">
                <p>
                  No hay vehículos disponibles en este momento. Prueba a activar el{' '}
                  <button type="button" className="btn btn--link" onClick={enableDemo}>
                    modo demo
                  </button>{' '}
                  para ver la aplicación con datos simulados.
                </p>
              </div>
            )}
          </>
        )}
      </aside>

    </div>
  );
}
