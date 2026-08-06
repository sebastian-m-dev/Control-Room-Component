'use client';

import { useEffect, useRef } from 'react';

type OdometerModule = {
  default: new (options: {
    el: HTMLElement;
    value: number;
    format: string;
    duration: number;
  }) => { update: (value: number) => void };
};

interface OdometerProps {
  value: number | null;
  duration?: number;
}

/**
 * Wrapper SSR-safe de Odometer (lib CommonJS que toca `document` al cargar).
 * Se importa dinámicamente dentro de useEffect para no romper el render
 * del servidor. Actualiza el valor con `.update()` sin parpadeos.
 *
 * Importante: la instancia de Odometer queda ligada al elemento HTML donde
 * nació. Si el valor pasa por `null` (p. ej. al cambiar de vehículo) el span
 * se desmonta y al volver el valor se monta un span NUEVO; por eso se guarda
 * `boundElRef` y se recrea la instancia si el elemento ligado cambió. Llamar
 * `update()` sobre un span desmontado rompe el render (layout shift / script).
 */
export function Odometer({ value, duration = 1200 }: OdometerProps) {
  const elRef = useRef<HTMLSpanElement>(null);
  const instanceRef = useRef<{ update: (value: number) => void } | null>(null);
  const boundElRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    let cancelled = false;

    const mount = () => {
      const el = elRef.current;
      if (!el) return;
      import('odometer').then((mod) => {
        if (cancelled || !elRef.current) return;
        const OdometerClass = (mod as OdometerModule).default;
        instanceRef.current = new OdometerClass({
          el,
          value: value ?? 0,
          format: 'd',
          duration,
        });
        boundElRef.current = el;
      });
    };

    mount();

    return () => {
      cancelled = true;
      instanceRef.current = null;
      boundElRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (value == null) return;
    const el = elRef.current;
    // El elemento ligado cambió (se desmontó al pasar por null): recrear.
    if (!instanceRef.current || boundElRef.current !== el) {
      import('odometer').then((mod) => {
        if (!elRef.current) return;
        const OdometerClass = (mod as OdometerModule).default;
        instanceRef.current = new OdometerClass({
          el: elRef.current,
          value,
          format: 'd',
          duration,
        });
        boundElRef.current = elRef.current;
      });
      return;
    }
    instanceRef.current?.update(value);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  if (value == null) {
    return <span className="odometer-placeholder">—</span>;
  }

  return <span className="odometer" ref={elRef} />;
}
