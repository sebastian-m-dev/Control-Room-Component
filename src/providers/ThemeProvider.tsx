'use client';

import { useEffect, useRef } from 'react';
import { useThemeStore } from '@/store/useThemeStore';

const THEME_TRANSITION_MS = 1000;

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useThemeStore((s) => s.theme);
  const initial = useRef(true);

  useEffect(() => {
    const root = document.documentElement;

    // Añade la clase de transición solo cuando cambia el tema (no en el montaje),
    // para que la animación de 1s no se dispare en el primer render.
    if (!initial.current) {
      root.classList.add('theme-transitioning');
    }
    initial.current = false;

    root.classList.toggle('dark', theme === 'dark');
    root.style.colorScheme = theme;

    const timeout = setTimeout(
      () => root.classList.remove('theme-transitioning'),
      THEME_TRANSITION_MS,
    );

    return () => clearTimeout(timeout);
  }, [theme]);

  return <>{children}</>;
}
