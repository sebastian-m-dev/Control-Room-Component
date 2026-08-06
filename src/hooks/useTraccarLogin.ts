'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { loginTraccar } from '@/lib/traccar';
import { useAppStore } from '@/store/useAppStore';

/**
 * Login manual contra el proxy de Traccar (POST /api/traccar/session).
 * Al autenticarse marca la consulta de sesión como exitosa para que
 * la carga de dispositivos y posiciones arranque automáticamente.
 */
export function useTraccarLogin() {
  const queryClient = useQueryClient();
  const setLoggedOut = useAppStore((s) => s.setLoggedOut);

  return useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) =>
      loginTraccar(email, password),
    onSuccess: (user) => {
      setLoggedOut(false);
      queryClient.setQueryData(['traccar', 'session', { mock: false }], user);
      queryClient.invalidateQueries({ queryKey: ['traccar', 'devices'] });
      queryClient.invalidateQueries({ queryKey: ['traccar', 'fleet'] });
      queryClient.invalidateQueries({ queryKey: ['traccar', 'position'] });
    },
  });
}
