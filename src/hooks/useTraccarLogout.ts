'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { logoutTraccar } from '@/lib/traccar';
import { useAppStore } from '@/store/useAppStore';

/**
 * Logout contra el proxy de Traccar (DELETE /api/traccar/session).
 * Invalida la cookie de sesión, limpia el cache de queries y marca
 * loggedOut para que la UI vuelva a la vista de login.
 */
export function useTraccarLogout() {
  const queryClient = useQueryClient();
  const setLoggedOut = useAppStore((s) => s.setLoggedOut);

  return useMutation({
    mutationFn: () => logoutTraccar(),
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: ['traccar'] });
      setLoggedOut(true);
    },
  });
}
