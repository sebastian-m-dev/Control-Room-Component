'use client';

import { useEffect, useState, type ReactNode } from 'react';

const FADE_MS = 240;

interface AlertLightboxProps {
  title: string;
  body?: ReactNode;
  actions?: ReactNode;
  /** Si se pasa, se muestra el botón de cerrar y el lightbox es dismissible. */
  onClose?: () => void;
}

/** Lightbox glass + modal alert alert--info (estilo unificado de avisos de sistema). */
export function AlertLightbox({ title, body, actions, onClose }: AlertLightboxProps) {
  const [closing, setClosing] = useState(false);

  const handleClose = () => {
    if (!onClose) return;
    setClosing(true);
    window.setTimeout(onClose, FADE_MS);
  };

  useEffect(() => {
    if (!onClose) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') handleClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  return (
    <div
      className={`alert-lightbox${closing ? ' alert-lightbox--closing' : ''}`}
      onClick={onClose ? handleClose : undefined}
    >
      <div className="alert alert--info" role="alert" onClick={(e) => e.stopPropagation()}>
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
        >
          <circle cx="12" cy="12" r="10" />
          <path d="M12 16v-4M12 8h.01" />
        </svg>
        <div className="alert__content">
          <p className="alert__title">{title}</p>
          {body && <div className="alert__body">{body}</div>}
          {actions && <div className="alert__actions">{actions}</div>}
        </div>
        {onClose && (
          <button type="button" className="alert__close" onClick={handleClose} aria-label="Cerrar alerta">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}
