// Configuración de Traccar.
// IMPORTANTE: este módulo solo debe importarse desde Server Components
// o Route Handlers. No exponer credenciales al cliente.

export const TRACCAR_BASE_URL =
  process.env.TRACCAR_BASE_URL ?? 'https://demo4.traccar.org';

export const TRACCAR_EMAIL = process.env.TRACCAR_EMAIL ?? 'admin';
export const TRACCAR_PASSWORD = process.env.TRACCAR_PASSWORD ?? 'admin';

// Email mostrado como sugerencia en el formulario de login (público, no es
// un secreto). La contraseña nunca se expone al cliente: el proxy usa la
// del .env cuando el formulario se envía vacío.
export const TRACCAR_EMAIL_HINT = process.env.NEXT_PUBLIC_TRACCAR_EMAIL ?? '';

// Nombre de la cookie donde guardamos la sesión de Traccar en nuestro dominio
export const SESSION_COOKIE_NAME = 'traccar_session';
