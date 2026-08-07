'use client';

import { useEffect, useId, useRef, useState, type ReactNode } from 'react';

const FADE_MS = 240;

interface AlertLightboxProps {
  title: string;
  body?: ReactNode;
  actions?: ReactNode;
  /** Si se pasa, se muestra el botón de cerrar y el lightbox es dismissible. */
  onClose?: () => void;
}

/**
 * Lightbox glass modal (estilo unificado de avisos de sistema).
 *
 * Accesibilidad WCAG 2.1 AA:
 * - Semántica de diálogo: role="dialog" + aria-modal + aria-labelledby.
 * - El foco se mueve al interior al abrir y se restaura al cerrar.
 * - Trampa de foco con Tab (no permite salir del diálogo por teclado).
 * - Cierre con Escape, botón de cerrar o click en el fondo.
 */
export function AlertLightbox({ title, body, actions, onClose }: AlertLightboxProps) {
  const [closing, setClosing] = useState(false);
  const titleId = useId();
  const bodyId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  const handleClose = () => {
    if (!onClose) return;
    setClosing(true);
    window.setTimeout(onClose, FADE_MS);
  };

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    // Si un hijo ya movió el foco dentro (p. ej. ErrorState enfoca
    // "Reintentar"), no lo robamos; si no, movemos el foco al diálogo.
    if (!dialog.contains(document.activeElement)) {
      previousFocusRef.current = document.activeElement as HTMLElement | null;
      dialog.focus({ preventScroll: true });
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        handleClose();
        return;
      }
      if (event.key !== 'Tab') return;

      const focusables = Array.from(
        dialog.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((el) => el.offsetParent !== null || el === document.activeElement);
      if (focusables.length === 0) return;

      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (document.activeElement === last || document.activeElement === dialog)) {
        event.preventDefault();
        first.focus();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      previousFocusRef.current?.focus?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={body ? bodyId : undefined}
      tabIndex={-1}
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
          <p className="alert__title" id={titleId}>
            {title}
          </p>
          {body && (
            <div className="alert__body" id={bodyId}>
              {body}
            </div>
          )}
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
