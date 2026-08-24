# Control Room · Monitor de Flota en Tiempo Real

Dashboard de monitorización de vehículos construido como prueba técnica de **Design Engineer (UX/UI)**.
Consume la API pública de [Traccar](https://www.traccar.org/api-reference/) a través de un proxy
**server-side** (Next.js Route Handlers) que evita problemas de **CORS**, oculta la sesión del navegador
y mantiene las credenciales fuera del cliente.

El mapa es un canvas **WebGL** (deck.gl) sobre Google Maps con interpolación de posición continua:
los vehículos nunca se detienen entre polls, giran según su rumbo y trazan su ruta en tiempo real.

---

🌐 **Language / Idioma:**
[English (Default) 🇬🇧](./README.md) • Español

---

## Stack

| Capa                | Tecnología                                                                   |
| ------------------- | ---------------------------------------------------------------------------- |
| Framework           | **Next.js 15** (App Router) + **React 19** + **TypeScript**                  |
| Rendering 3D/2D     | **deck.gl** (`@deck.gl/google-maps`, `IconLayer`, `PathLayer`) + Google Maps |
| Data fetching       | **TanStack Query v5** (polling, retry con backoff, cache, estados)           |
| Estado global       | **Zustand** (tema, mock mode, vehículo seleccionado, tipos de vehículo)      |
| Estilos             | **Tailwind CSS v3** + **SCSS modular** (design tokens en CSS Custom Properties) |
| Animación de valores| **Odometer** (odómetro de velocidad / batería / rumbo)                       |
| Backend (proxy)     | Next.js **Route Handlers** (Node runtime)                                    |
| Accesibilidad       | **WCAG 2.1 AA** (HTML semántico, ARIA, gestión de foco, `prefers-reduced-motion`) |

---

## Requisitos

- **Node.js** 18.18+ (recomendado 20+)
- **npm**
- (Opcional) Cuenta en un servidor Traccar y API key de Google Maps Platform

---

## Puesta en marcha (local)

```bash
# 1. Instalar dependencias
npm install

# 2. Configurar variables de entorno
cp .env.example .env.local
#   → Rellena solo las que vayas a usar (ver "Variables de entorno")

# 3. Arrancar el servidor de desarrollo
npm run dev
```

Abre **http://localhost:3000**.

> La app arranca en **Modo Demo** con datos simulados aunque no configures nada:
> tres vehículos circulan por calles reales de Madrid sin necesidad de Traccar ni API key.

### Ver la app desde el móvil (misma red WiFi)

```bash
npm run dev -- -H 0.0.0.0
```

Después abre `http://<IP-de-tu-mac>:3000` en el teléfono. Si no carga, revisa el
**aislamiento de clientes (AP isolation)** del router. Como alternativa, cualquier túnel
(`localhost.run`, `ngrok`, Cloudflare Tunnel) reenvía `localhost:3000` a una URL pública.

---

## Variables de entorno

Copia `.env.example` a `.env.local`. **No subas `.env.local` al repositorio** (está en `.gitignore`).

| Variable                        | Ámbito   | Obligatoria | Descripción                                                        |
| ------------------------------- | -------- | ----------- | ------------------------------------------------------------------ |
| `TRACCAR_BASE_URL`              | Servidor | No*         | Base URL de tu servidor Traccar (p. ej. `https://demo4.traccar.org`) |
| `TRACCAR_EMAIL`                 | Servidor | No*         | Usuario Traccar para login automático                              |
| `TRACCAR_PASSWORD`              | Servidor | No*         | Contraseña Traccar para login automático                           |
| `NEXT_PUBLIC_TRACCAR_EMAIL`     | Cliente  | No          | Email sugerido/pre-relleno en el formulario de login               |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | Cliente | No**       | API key de Google Maps (Maps JavaScript API)                      |
| `GOOGLE_DIRECTIONS_API_KEY`     | Servidor | No***      | Key server-side para la Google **Directions API** (rutas del demo) |

\* Sin estas variables el login usa las credenciales que escribas en el formulario, o **Modo Demo**.
\** Necesaria para el mapa. Sin ella, el mapa muestra un aviso y la app funciona con el resto de la UI.
\*** Recomendada para las rutas por calles del Modo Demo (ver más abajo).

### Google Maps Platform

1. Crea una **API key** en Google Cloud Console → *APIs & Services*.
2. Habilita **Maps JavaScript API** y **Directions API**.
3. Restringe la key por **HTTP referrers** (p. ej. `http://localhost:3000`). Es una key pública por
   diseño (prefijo `NEXT_PUBLIC_`), pero siempre debe ir acotada por referrer y, a ser posible, por API.

> `NEXT_PUBLIC_GOOGLE_MAP_ID` (Map ID vectorial) está **obsoleto/retirado** en este proyecto: los
> estilos del mapa se aplican por JS (`MapOptions.styles`), no por Map ID.

#### Por qué necesitas una segunda key para las rutas (Directions API)

La Google **Directions API** es un *web service* que se consume desde el servidor (nuestro proxy
`/api/maps/directions`). Una key restringida por **HTTP referrers** solo puede usarse desde el
navegador (la Maps JS API envía la cabecera `Referer`); al llamarla desde el servidor, sin `Referer`,
Google responde `REQUEST_DENIED: API keys with referer restrictions cannot be used with this API`.

Sin rutas, los vehículos del Modo Demo usan un bucle circular de respaldo. Para que sigan calles reales:

1. Crea una **segunda API key** en Google Cloud Console.
2. Restríngea **solo por API** (habilita únicamente *Directions API*) — no uses restricción por referrer.
   Como es una key server-side (`GOOGLE_DIRECTIONS_API_KEY`, sin prefijo `NEXT_PUBLIC_`), nunca llega
   al navegador.
3. Añádela a `.env.local` (y a las variables de entorno de tu plataforma de despliegue).

---

## Conexión con Traccar (endpoints)

Toda petición a Traccar pasa por un Route Handler que actúa de proxy. El navegador **nunca** ve las
credenciales: solo recibe una cookie `traccar_session` **httpOnly** con el `JSESSIONID`.

| Ruta                    | Método | Descripción                                                                      |
| ----------------------- | ------ | -------------------------------------------------------------------------------- |
| `/api/traccar/session`  | POST   | Autentica contra `POST /api/session` de Traccar y guarda el `JSESSIONID` en cookie httpOnly |
| `/api/traccar/session`  | DELETE | Cierra sesión (invalida la cookie local)                                        |
| `/api/traccar/devices`  | GET    | Reenvía `GET /api/devices` con la sesión guardada                               |
| `/api/traccar/positions`| GET    | Reenvía `GET /api/positions` con la sesión guardada                             |
| `/api/maps/directions`  | GET    | Proxy a Google **Directions API** (los web services no envían cabeceras CORS)   |

**Flujo de login real:**
1. `POST /api/traccar/session` → Traccar devuelve `JSESSIONID` → se guarda en cookie httpOnly.
2. `GET /api/traccar/devices` y `GET /api/traccar/positions` reenvían la petición con la cookie.
3. Si la sesión expira (HTTP 401), la app vuelve automáticamente a la vista de login.

---

## Modo Demo

Los servidores públicos de Traccar ya **no incluyen un usuario por defecto** (`admin/admin` fue
retirado). Para que la app nunca se vea vacía ni rota, existe el **Modo Demo**:

- Se activa desde el botón *"Probar con datos de demostración"* del login, o automáticamente si no
  hay credenciales de entorno.
- Tres vehículos simulados (furgón, camión y moto) avanzan por **calles reales de Madrid**: cada uno
  pide una ruta a la **Directions API** una sola vez y recorre su polyline en ping-pong (ida y vuelta),
  con velocidad y rumbo coherentes.
- Si la Directions API no está disponible, se usa un **bucle circular determinístico** como fallback.
- Interruptor «Modo Demo» en el header para alternar entre simulación y conexión real.

---

## Arquitectura y decisiones técnicas

### Capa de datos (TanStack Query)

- **Sesión**: `useTraccarSession` — una sola petición, caché infinita. El login manual (`useTraccarLogin`)
  actualiza la caché para arrancar devices/positions sin re-render condicional.
- **Devices**: `useTraccarDevices` — polling 60s (30s en demo), solo tras sesión exitosa.
- **Fleet/Positions**: `useTraccarFleet` — polling 2.5s real / 1.5s demo; reduce las posiciones a la
  más reciente por dispositivo.

### Animación del mapa (deck.gl + Google Maps)

- **`useVehicleTrip`** (vista individual): interpola la posición del vehículo entre el fix anterior y el
  nuevo durante el intervalo del polling con `requestAnimationFrame`. El icono rota suavemente hacia el
  rumbo real (`bearing`) con `IconLayer.getAngle`. La cámara sigue al foco con un **offset de +100 px
  en el eje Y**.
- **`useFleetTrip`** (vista flota): misma mecánica aplicada a todos los vehículos a la vez.
- **`TripBuilder`** (`trip-builder.ts`): motor de conducción por keyframes (velocidad, giro y bucle).
- **`mock.ts`**: decodificador de **polyline de Google**, cálculo de distancias (haversine) y rutas demo.
- Los accesores (`getFrame`, `getPath`, `getFleetFrames`) son **refs estables**: el bucle de render del
  mapa no se reinicia en cada poll.

### Accesibilidad (WCAG 2.1 AA)

- HTML semántico: `<header>`, `<main>`, `<article>`, `<dl>/<dt>/<dd>`, `<label>`.
- Formularios con `label` + `htmlFor`, `aria-required`, `aria-invalid` implícito.
- **Diálogos accesibles**: `AlertLightbox` usa `role="dialog"` + `aria-modal`, mueve el foco al abrir,
  aplica *focus trap* con Tab y lo restaura al cerrar; se cierra con `Escape`.
- `role="switch"` + `aria-checked` en toggles; `role="radiogroup"` con navegación por flechas/Home/End.
- Regiones `aria-live` (estado del vehículo), `aria-busy` en skeletons.
- Anillos de foco visibles (`:focus-visible`), `sr-only` para anuncios, soporte de `prefers-reduced-motion`.
- Contraste y espaciado basados en design tokens por tema (Light/Dark).

---

## Estructura del proyecto

```
src/
  app/
    layout.tsx              # Root layout (ThemeProvider + React Query + Header)
    page.tsx                # Renderiza el Dashboard
    api/
      traccar/
        session/route.ts    # POST/DELETE auth proxy (cookie httpOnly)
        devices/route.ts    # GET proxy devices
        positions/route.ts  # GET proxy positions
      maps/
        directions/route.ts # GET proxy Google Directions API
  components/
    Dashboard.tsx           # Orquestación de estados (login / carga / error / app)
    LoginView.tsx           # Autenticación con foco inicial y toggle de contraseña
    Header.tsx              # ThemeToggle + LogoutButton
    MapView.tsx             # Google Maps + deck.gl overlay, cámara y layers
    StatusCard.tsx          # Tarjeta de estado en vivo (odómetros + live region)
    FleetSummary.tsx        # Resumen de flota (vista "todos los vehículos")
    AlertLightbox.tsx       # Diálogo modal accesible para avisos/errores
    DeviceSelector.tsx      # Selector de vehículo (vista flota / individual)
    VehicleKindSelector.tsx # Tipo de icono por vehículo (radiogroup accesible)
    ErrorState.tsx          # Estados de error empáticos (focus en "Reintentar")
    LoadingSkeleton.tsx     # Skeletons CLS-free
    VehicleIcon.tsx         # Avatar -thumb del vehículo en la card
    Odometer.tsx            # Odómetro animado (velocidad, batería, rumbo)
  hooks/                    # useTraccarSession/Devices/Fleet/Position, useVehicleTrip,
                            # useFleetTrip, useTraccarLogin/Logout, useNow
  lib/                      # config.ts, traccar.ts, mock.ts, vehicle.ts,
                            # trip-builder.ts, utils.ts
  providers/                # ReactQueryProvider, ThemeProvider
  store/                    # useAppStore, useThemeStore (Zustand + persist)
  styles/                   # Design tokens + SCSS modular por componente
  types/                    # Modelos de la API de Traccar
```

---

## Scripts

```bash
npm run dev          # Servidor de desarrollo (http://localhost:3000)
npm run build        # Build de producción
npm start            # Sirve el build de producción
npm run typecheck    # Compilación TypeScript (tsc --noEmit)
```

---

## Despliegue

Compatibilidad total con **Vercel / Netlify** (funciones serverless de Node) o cualquier host con
Node.js. Configura las mismas variables de entorno en la plataforma (las credenciales de Traccar y la
API key de Google). En producción la cookie de sesión se marca como `Secure`.
