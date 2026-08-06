'use client';

import { useTraccarLogout } from '@/hooks/useTraccarLogout';

/** Botón de cerrar sesión con el mismo formato que el theme toggle. */
export function LogoutButton() {
  const logout = useTraccarLogout();

  return (
    <button
      type="button"
      className="theme-toggle"
      aria-label="Cerrar sesión"
      title="Cerrar sesión"
      disabled={logout.isPending}
      onClick={() => logout.mutate()}
    >
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        style={{
          transform: 'rotate(180deg)'
        }}
      >
        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
        <path d="m16 17 5-5-5-5" />
        <path d="M21 12H9" />
      </svg>
    </button>
  );
}
