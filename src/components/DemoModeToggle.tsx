'use client';

import { useAppStore } from '@/store/useAppStore';

/** Switch de Modo Simulación/Demo: garantiza que la app nunca se rompa. */
export function DemoModeToggle() {
  const mockMode = useAppStore((s) => s.mockMode);
  const toggleMockMode = useAppStore((s) => s.toggleMockMode);

  return (
    <button
      type="button"
      className="demo-toggle"
      role="switch"
      aria-checked={mockMode}
      onClick={toggleMockMode}
    >
      <span className="demo-toggle__track" aria-hidden="true">
        <span className="demo-toggle__thumb" />
      </span>
      <span className="demo-toggle__label">Modo Demo</span>
    </button>
  );
}
