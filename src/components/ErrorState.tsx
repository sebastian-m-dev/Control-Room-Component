'use client';

import { useEffect, useRef } from 'react';

import { AlertLightbox } from './AlertLightbox';

export type ErrorKind = 'auth' | 'connection' | 'position';

interface ErrorStateProps {
  kind: ErrorKind;
  message?: string;
  onRetry: () => void;
  onEnableDemo?: () => void;
}

const CONTENT: Record<ErrorKind, { title: string; copy: string }> = {
  auth: {
    title: 'No pudimos conectarnos al servidor',
    copy: 'Los servidores públicos de demostración de Traccar ya no incluyen un usuario por defecto (admin/admin fue retirado). Registra tu cuenta en demo4.traccar.org o configura tu propio servidor en las variables de entorno.',
  },
  connection: {
    title: 'Se perdió la conexión con Traccar',
    copy: 'No se pudieron obtener los datos de la flota. El servidor puede estar caído, bloqueado por CORS o con problemas de red.',
  },
  position: {
    title: 'Sin actualización de posición',
    copy: 'El vehículo seleccionado no está reportando su ubicación en este momento.',
  },
};

export function ErrorState({ kind, message, onRetry, onEnableDemo }: ErrorStateProps) {
  const retryRef = useRef<HTMLButtonElement>(null);
  const content = CONTENT[kind];

  // Mueve el foco al botón de reintento al aparecer el error (accesible por teclado).
  useEffect(() => {
    retryRef.current?.focus();
  }, []);

  return (
    <AlertLightbox
      title={content.title}
      body={message ?? content.copy}
      actions={
        <>
          <button ref={retryRef} type="button" className="btn btn--primary" onClick={onRetry}>
            Reintentar
          </button>
          {onEnableDemo && (
            <button type="button" className="btn btn--ghost" onClick={onEnableDemo}>
              Probar con datos de demostración
            </button>
          )}
        </>
      }
    />
  );
}
