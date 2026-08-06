'use client';

import { useEffect, useRef, useState } from 'react';
import { useTraccarLogin } from '@/hooks/useTraccarLogin';

interface LoginViewProps {
  onEnableDemo?: () => void;
}

/**
 * Pantalla de autenticación: formulario accesible que inicia sesión
 * contra Traccar a través del Route Handler proxy (POST /api/session).
 */
export function LoginView({ onEnableDemo }: LoginViewProps) {
  // Pre-rellenado con la cuenta configurada en el servidor (si existe).
  const [email, setEmail] = useState(process.env.NEXT_PUBLIC_TRACCAR_EMAIL ?? '');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const login = useTraccarLogin();
  const emailRef = useRef<HTMLInputElement>(null);

  // Mueve el foco al primer campo para operar 100% por teclado
  useEffect(() => {
    emailRef.current?.focus();
  }, []);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!email.trim() || !password) return;
    login.mutate({ email: email.trim(), password });
  };

  return (
    <div className="login-card" aria-labelledby="login-title">
      <div className="login-card__icon" aria-hidden="true">
        <svg
          width="26"
          height="26"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="3" y="11" width="18" height="11" rx="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
      </div>

      <h2 id="login-title" className="login-card__title">
        Conectarse a Traccar
      </h2>
      <p className="login-card__copy">
        Introduce las credenciales de tu servidor Traccar (por ejemplo, una cuenta registrada en{' '}
        <code>demo4.traccar.org</code>, que es gratuita). Si aún no tienes servidor, puedes probar
        la app con datos simulados pulsando el botón de abajo.
      </p>

      {login.isError && (
        <p className="login-card__error" role="alert">
          {login.error?.message ?? 'No se pudo iniciar sesión. Revisa tus credenciales.'}
        </p>
      )}

      <form className="login-card__form" onSubmit={handleSubmit} noValidate>
        <div className="field">
          <label className="field__label" htmlFor="login-email">
            Correo o usuario
          </label>
          <input
            id="login-email"
            ref={emailRef}
            type="email"
            className="input"
            autoComplete="email"
            placeholder={process.env.NEXT_PUBLIC_TRACCAR_EMAIL || 'usuario@ejemplo.com'}
            required
            aria-required="true"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div className="field">
          <label className="field__label" htmlFor="login-password">
            Contraseña
          </label>
          <div className="password-wrap">
            <input
              id="login-password"
              type={showPassword ? 'text' : 'password'}
              className="input"
              autoComplete="current-password"
              placeholder="••••••••"
              required
              aria-required="true"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button
              type="button"
              className="password-toggle"
              aria-pressed={showPassword}
              aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              onClick={() => setShowPassword((s) => !s)}
            >
              {showPassword ? (
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
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                  <path d="M1 1l22 22" />
                </svg>
              ) : (
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
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              )}
            </button>
          </div>
        </div>

        <button type="submit" className="btn btn--primary login-card__submit" disabled={login.isPending}>
          {login.isPending ? 'Conectando…' : 'Iniciar sesión'}
        </button>
      </form>

      <p className="login-card__hint">
        Para conectar datos reales, configura tu servidor y credenciales en <code>.env</code>, o
        usa el formulario con las de tu cuenta de Traccar.
      </p>

      {onEnableDemo && (
        <button type="button" className="btn btn--ghost login-card__demo" onClick={onEnableDemo}>
          Probar con datos de demostración
        </button>
      )}
    </div>
  );
}
