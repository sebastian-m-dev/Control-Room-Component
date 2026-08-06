'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { VehicleKind } from '@/lib/vehicle';

interface AppState {
  selectedDeviceId: number | null;
  setSelectedDeviceId: (id: number | null) => void;
  /** Modo flota: mostrar todos los vehículos en el mapa (opción "Todos"). */
  showAllVehicles: boolean;
  setShowAllVehicles: (value: boolean) => void;
  mockMode: boolean;
  setMockMode: (value: boolean) => void;
  toggleMockMode: () => void;
  loggedOut: boolean;
  setLoggedOut: (value: boolean) => void;
  // Tipo de vehículo elegido manualmente por el usuario, por dispositivo.
  // Cuando Traccar no trae categoría (o no se detecta por nombre), el icono
  // de la card y del mapa usa este override en lugar del por defecto 'car'.
  vehicleKinds: Record<number, VehicleKind>;
  setVehicleKind: (deviceId: number, kind: VehicleKind) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      selectedDeviceId: null,
      setSelectedDeviceId: (id) => set({ selectedDeviceId: id }),
      // Tras el login el usuario ve la flota completa; al elegir un
      // vehículo concreto en el selector se pasa a vista individual.
      showAllVehicles: true,
      setShowAllVehicles: (value) => set({ showAllVehicles: value }),
      // Arrancamos en modo real (datos de Traccar). El Modo Demo queda
      // disponible vía toggle para cuando no haya servidor o credenciales.
      mockMode: false,
      setMockMode: (value) => set({ mockMode: value }),
      toggleMockMode: () => set((s) => ({ mockMode: !s.mockMode })),
      loggedOut: false,
      setLoggedOut: (value) => set({ loggedOut: value }),
      vehicleKinds: {},
      setVehicleKind: (deviceId, kind) =>
        set((s) => ({ vehicleKinds: { ...s.vehicleKinds, [deviceId]: kind } })),
    }),
    {
      name: 'control-room-preferences',
      storage: createJSONStorage(() => localStorage),
      version: 6,
      migrate: (persisted, version) => {
        const state = (persisted ?? {}) as Partial<AppState>;
        // A partir de la v5: modo real por defecto y overrides de tipo nuevos.
        state.mockMode = false;
        state.vehicleKinds = state.vehicleKinds ?? {};
        // A partir de la v6: flota completa visible por defecto al entrar.
        state.showAllVehicles = state.showAllVehicles ?? true;
        return state as AppState;
      },
      partialize: (s) => ({
        mockMode: s.mockMode,
        selectedDeviceId: s.selectedDeviceId,
        showAllVehicles: s.showAllVehicles,
        vehicleKinds: s.vehicleKinds,
      }),
    },
  ),
);
