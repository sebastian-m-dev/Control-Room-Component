'use client';

import { useState } from 'react';

import { AlertLightbox } from './AlertLightbox';

/** Aviso informativo visible cuando la app está en Modo Demo. */
export function DemoNotice() {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <AlertLightbox
      title="Mostrando datos simulados"
      body={
        <>
          Los demos públicos de Traccar ya no incluyen usuario por defecto. Desactiva el interruptor
          «Modo Demo» y configura tu servidor en <code>.env</code> para conectar datos en vivo.
        </>
      }
      onClose={() => setDismissed(true)}
    />
  );
}
