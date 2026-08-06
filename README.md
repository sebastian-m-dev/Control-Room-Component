# Control Room — Monitor de Vehículos en Tiempo Real

SPA de monitorización de flota construida para la prueba técnica de **Design Engineer (UX/UI)**.
Se conecta a la API pública de [Traccar](https://www.traccar.org/api-reference/) mediante un proxy
serverless (Next.js Route Handlers) que evita problemas de CORS y oculta la sesión del navegador.

## Stack

| Capa            | Tecnología                                                        |
| --------------- | ----------------------------------------------------------------- |
| Framework       | Next.js 15 (App Router) + React 19 + TypeScript                   |
| Estilos         | Tailwind CSS v3 + SCSS modular (design tokens en CSS Custom Properties) |
| Estado          | Zustand (tema, vehículo seleccionado, modo demo)                  |
| Datos           | TanStack Query (polling, retry con backoff, cache, estados)       |
| Mapas           | Leaflet + react-leaflet (cargados solo en cliente)                |
| Despliegue      | Vercel / Netlify / cualquier host de Node                        |

## Requisitos

- Node.js 18.18+ (recomendado 20+)
- npm

## Ejecución local

```bash
npm install
npm run dev
```

Abre `http://localhost:3000`.

## Modo Demo (predeterminado)

Los servidores de demostración públicos de Traccar ya **no incluyen un usuario por defecto**
(`admin/admin` fue retirado). Por eso la app arranca en **Modo Demo** con datos simulados en
tiempo real para que nunca se vea vacía ni rota. El interruptor **«Modo Demo»** del header
alterna entre simulación y conexión real.

### Credenciales de demostración simuladas

El formulario de login viene pre-cargado con **`admin/admin`** (también acepta `demo/demo`). Si el
servidor real rechaza esas credenciales, el proxy activa una **sesión simulada**: la app ejecuta
todo el flujo real (`POST /session` → `GET /devices` → `GET /positions`) respondiendo con datos
mock, de modo que la experiencia se puede demostrar de extremo a extremo.

### Conectar datos reales (tu propio servidor Traccar)

1. Registra una cuenta en `https://demo4.traccar.org` o levanta tu propio servidor Traccar.
2. Crea `.env.local` (ver `.env.example`):

```bash
TRACCAR_BASE_URL=https://demo4.traccar.org
TRACCAR_EMAIL=tu_correo
TRACCAR_PASSWORD=tu_password
```

3. Reinicia `npm run dev` y desactiva el interruptor «Modo Demo».

Estas variables solo se leen en el servidor (Route Handlers); nunca se exponen al cliente.

## Endpoints proxy (backend)

| Ruta                  | Método | Descripción                                                        |
| --------------------- | ------ | ------------------------------------------------------------------ |
| `/api/traccar/session` | POST   | Autentica contra `POST /api/session` de Traccar y guarda la sesión httpOnly |
| `/api/traccar/devices` | GET    | Reenvía `GET /api/devices` con la sesión guardada                  |
| `/api/traccar/positions` | GET  | Reenvía `GET /api/positions` con la sesión guardada                |

## Estructura

```
src/
  app/
    api/traccar/            # Route Handlers proxy
    layout.tsx              # Providers (React Query + Theme) y Header accesible
    page.tsx                # Renderiza el Dashboard
  components/
    Header, ThemeToggle, DemoModeToggle, DemoNotice
    DeviceSelector, StatusCard, AlertBanner
    MapView, SmoothMarker   # Mapa + interpolación de marcador y rotación por course
    LoadingSkeleton, ErrorState, AnimatedValue
  hooks/                    # useTraccarSession/Devices/Position, useNow
  lib/                      # cliente API, mock data, utilidades, config
  providers/                # ReactQueryProvider, ThemeProvider
  store/                    # Zustand: tema y preferencias de la app
  styles/
    _variables.scss         # Design tokens (Light/Dark)
    _mixins.scss            # respond(), focus-ring(), sr-only()
    components/             # _status-card, _map, _controls, _skeleton, _ui
    globals.scss            # @tailwind + imports SASS + base/layout
  types/traccar.ts
```

## Decisiones de diseño

- **Skeletons CLS-free**: mapa y tarjeta reservan espacio con `min-height`/`aspect-ratio`
  desde el primer frame.
- **Estados de error empáticos**: pantalla con micro-copy, foco en el botón «Reintentar»
  (React Query `refetch`) y atajo a Modo Demo.
- **Marker smoothing**: el marcador interpola lat/lng con `requestAnimationFrame`
  (lerp basado en tiempo) y rota continuamente según `course`.
- **Accesibilidad WCAG 2.1 AA**: HTML semántico (`<article>`, `<dl>/<dt>/<dd>`),
  `aria-live` en la tarjeta y el mapa, `role="switch"`, anillos `:focus-visible`,
  `prefers-reduced-motion`.
- **Velocidad**: Traccar devuelve nudos; se convierte a km/h (`knots * 1.852`).

## Scripts

```bash
npm run dev        # desarrollo
npm run build      # build de producción
npm start          # sirve el build
npm run typecheck  # comprobación de tipos
```
