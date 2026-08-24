# Control Room · Real-Time Fleet Monitor

Vehicle monitoring dashboard built as a **Design Engineer (UX/UI)** technical test.
Consumes [Traccar's](https://www.traccar.org/api-reference/) public API through a
**server-side** proxy (Next.js Route Handlers) that avoids **CORS** issues, hides the session from the browser
and keeps credentials out of the client. [Demo](https://control-room-delta-eight.vercel.app/).

The map is a **WebGL** canvas (deck.gl) on top of Google Maps with continuous position interpolation:
vehicles never stop between polls, turn according to their heading and trace their route in real time.

---

🌐 **Language / Idioma:**
English (Default) • [Leer esta documentación en Español 🇪🇸](./README.es.md)

---

## Stack

| Layer                | Technology                                                                   |
| -------------------- | ---------------------------------------------------------------------------- |
| Framework            | **Next.js 15** (App Router) + **React 19** + **TypeScript**                  |
| 3D/2D Rendering      | **deck.gl** (`@deck.gl/google-maps`, `IconLayer`, `PathLayer`) + Google Maps |
| Data fetching        | **TanStack Query v5** (polling, retry with backoff, cache, states)           |
| Global state         | **Zustand** (theme, mock mode, selected vehicle, vehicle types)              |
| Styling              | **Tailwind CSS v3** + **modular SCSS** (design tokens as CSS Custom Properties) |
| Value animation      | **Odometer** (speed / battery / heading odometer)                            |
| Backend (proxy)      | Next.js **Route Handlers** (Node runtime)                                    |
| Accessibility        | **WCAG 2.1 AA** (semantic HTML, ARIA, focus management, `prefers-reduced-motion`) |

---

## Requirements

- **Node.js** 18.18+ (20+ recommended)
- **npm**
- (Optional) An account on a Traccar server and a Google Maps Platform API key

---

## Getting started (local)

```bash
# 1. Install dependencies
npm install

# 2. Set up environment variables
cp .env.example .env.local
#   → Fill in only the ones you will use (see "Environment variables")

# 3. Start the development server
npm run dev
```

Open **http://localhost:3000**.

> The app starts in **Demo Mode** with simulated data even if you configure nothing:
> three vehicles drive around real streets in Madrid without needing Traccar or an API key.

### View the app from your phone (same WiFi network)

```bash
npm run dev -- -H 0.0.0.0
```

Then open `http://<your-mac-ip>:3000` on your phone. If it doesn't load, check your router's
**client isolation (AP isolation)** setting. Alternatively, any tunnel service
(`localhost.run`, `ngrok`, Cloudflare Tunnel) forwards `localhost:3000` to a public URL.

---

## Environment variables

Copy `.env.example` to `.env.local`. **Do not commit `.env.local` to the repository** (it's in `.gitignore`).

| Variable                        | Scope    | Required | Description                                                        |
| ------------------------------- | -------- | -------- | ------------------------------------------------------------------ |
| `TRACCAR_BASE_URL`              | Server   | No*      | Base URL of your Traccar server (e.g. `https://demo4.traccar.org`) |
| `TRACCAR_EMAIL`                 | Server   | No*      | Traccar username for automatic login                               |
| `TRACCAR_PASSWORD`              | Server   | No*      | Traccar password for automatic login                               |
| `NEXT_PUBLIC_TRACCAR_EMAIL`     | Client   | No       | Suggested/pre-filled email in the login form                       |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | Client | No**     | Google Maps API key (Maps JavaScript API)                          |
| `GOOGLE_DIRECTIONS_API_KEY`     | Server   | No***    | Server-side key for the Google **Directions API** (demo routes)    |

\* Without these variables, login uses whatever credentials you type into the form, or **Demo Mode**.
\** Needed for the map. Without it, the map shows a notice and the app works with the rest of the UI.
\*** Recommended for street-level routes in Demo Mode (see below).

### Google Maps Platform

1. Create an **API key** in Google Cloud Console → *APIs & Services*.
2. Enable **Maps JavaScript API** and **Directions API**.
3. Restrict the key by **HTTP referrers** (e.g. `http://localhost:3000`). It is a public key by
   design (`NEXT_PUBLIC_` prefix), but it should always be scoped by referrer and, where possible, by API.

> `NEXT_PUBLIC_GOOGLE_MAP_ID` (vector Map ID) is **deprecated/retired** in this project: map
> styles are applied via JS (`MapOptions.styles`), not via Map ID.

#### Why you need a second key for routes (Directions API)

The Google **Directions API** is a *web service* consumed from the server (our proxy
`/api/maps/directions`). A key restricted by **HTTP referrers** can only be used from the
browser (the Maps JS API sends the `Referer` header); when called from the server, without a `Referer`,
Google responds `REQUEST_DENIED: API keys with referer restrictions cannot be used with this API`.

Without routes, Demo Mode vehicles fall back to a circular loop. To make them follow real streets:

1. Create a **second API key** in Google Cloud Console.
2. Restrict it **by API only** (enable *Directions API* exclusively) — do not use referrer restrictions.
   Since it is a server-side key (`GOOGLE_DIRECTIONS_API_KEY`, no `NEXT_PUBLIC_` prefix), it never
   reaches the browser.
3. Add it to `.env.local` (and to your hosting platform's environment variables).

---

## Traccar connection (endpoints)

Every request to Traccar goes through a Route Handler acting as a proxy. The browser **never** sees the
credentials: it only receives an **httpOnly** `traccar_session` cookie holding the `JSESSIONID`.

| Route                   | Method | Description                                                                      |
| ----------------------- | ------ | -------------------------------------------------------------------------------- |
| `/api/traccar/session`  | POST   | Authenticates against Traccar's `POST /api/session` and stores the `JSESSIONID` in an httpOnly cookie |
| `/api/traccar/session`  | DELETE | Signs out (invalidates the local cookie)                                         |
| `/api/traccar/devices`  | GET    | Forwards `GET /api/devices` with the stored session                              |
| `/api/traccar/positions`| GET    | Forwards `GET /api/positions` with the stored session                            |
| `/api/maps/directions`  | GET    | Proxy to the Google **Directions API** (web services don't send CORS headers)    |

**Real login flow:**
1. `POST /api/traccar/session` → Traccar returns a `JSESSIONID` → stored in an httpOnly cookie.
2. `GET /api/traccar/devices` and `GET /api/traccar/positions` forward requests with the cookie.
3. If the session expires (HTTP 401), the app automatically returns to the login view.

---

## Demo Mode

Traccar's public servers **no longer include a default user** (`admin/admin` was removed). So the
app never looks empty or broken, there is a **Demo Mode**:

- Activated from the *"Try demo data"* button on the login screen, or automatically if there are
  no environment credentials.
- Three simulated vehicles (van, truck and motorcycle) drive along **real streets in Madrid**: each one
  requests a route from the **Directions API** once and travels its polyline ping-pong style (back and forth),
  with coherent speed and heading.
- If the Directions API is unavailable, a **deterministic circular loop** is used as fallback.
- A "Demo Mode" switch in the header toggles between simulation and real connection.

---

## Architecture & technical decisions

### Data layer (TanStack Query)

- **Session**: `useTraccarSession` — single request, infinite cache. Manual login (`useTraccarLogin`)
  updates the cache so devices/positions start without conditional re-rendering.
- **Devices**: `useTraccarDevices` — 60s polling (30s in demo), only after a successful session.
- **Fleet/Positions**: `useTraccarFleet` — 2.5s polling live / 1.5s demo; reduces positions to the
  latest one per device.

### Map animation (deck.gl + Google Maps)

- **`useVehicleTrip`** (single view): interpolates the vehicle position between the previous fix and the
  new one across the polling interval using `requestAnimationFrame`. The icon rotates smoothly toward the
  real bearing via `IconLayer.getAngle`. The camera follows the focus with a **+100 px offset
  on the Y axis**.
- **`useFleetTrip`** (fleet view): same mechanics applied to all vehicles at once.
- **`TripBuilder`** (`trip-builder.ts`): keyframe driving engine (speed, turning and looping).
- **`mock.ts`**: Google **polyline** decoder, distance calculation (haversine) and demo routes.
- Accessors (`getFrame`, `getPath`, `getFleetFrames`) are **stable refs**: the map render loop
  doesn't restart on every poll.

### Accessibility (WCAG 2.1 AA)

- Semantic HTML: `<header>`, `<main>`, `<article>`, `<dl>/<dt>/<dd>`, `<label>`.
- Forms with `label` + `htmlFor`, `aria-required`, implicit `aria-invalid`.
- **Accessible dialogs**: `AlertLightbox` uses `role="dialog"` + `aria-modal`, moves focus on open,
  applies a *focus trap* with Tab and restores it on close; closes with `Escape`.
- `role="switch"` + `aria-checked` on toggles; `role="radiogroup"` with arrow/Home/End navigation.
- `aria-live` regions (vehicle status), `aria-busy` on skeletons.
- Visible focus rings (`:focus-visible`), `sr-only` for announcements, `prefers-reduced-motion` support.
- Contrast and spacing based on per-theme design tokens (Light/Dark).

---

## Project structure

```
src/
  app/
    layout.tsx              # Root layout (ThemeProvider + React Query + Header)
    page.tsx                # Renders the Dashboard
    api/
      traccar/
        session/route.ts    # POST/DELETE auth proxy (httpOnly cookie)
        devices/route.ts    # GET devices proxy
        positions/route.ts  # GET positions proxy
      maps/
        directions/route.ts # GET Google Directions API proxy
  components/
    Dashboard.tsx           # State orchestration (login / loading / error / app)
    LoginView.tsx           # Authentication with initial focus and password toggle
    Header.tsx              # ThemeToggle + LogoutButton
    MapView.tsx             # Google Maps + deck.gl overlay, camera and layers
    StatusCard.tsx          # Live status card (odometers + live region)
    FleetSummary.tsx        # Fleet summary ("all vehicles" view)
    AlertLightbox.tsx       # Accessible modal dialog for alerts/errors
    DeviceSelector.tsx      # Vehicle selector (fleet / single view)
    VehicleKindSelector.tsx # Per-vehicle icon type (accessible radiogroup)
    ErrorState.tsx          # Empathetic error states (focus on "Retry")
    LoadingSkeleton.tsx     # CLS-free skeletons
    VehicleIcon.tsx         # Vehicle avatar thumb on the card
    Odometer.tsx            # Animated odometer (speed, battery, heading)
  hooks/                    # useTraccarSession/Devices/Fleet/Position, useVehicleTrip,
                            # useFleetTrip, useTraccarLogin/Logout, useNow
  lib/                      # config.ts, traccar.ts, mock.ts, vehicle.ts,
                            # trip-builder.ts, utils.ts
  providers/                # ReactQueryProvider, ThemeProvider
  store/                    # useAppStore, useThemeStore (Zustand + persist)
  styles/                   # Design tokens + modular SCSS per component
  types/                    # Traccar API models
```

---

## Scripts

```bash
npm run dev          # Development server (http://localhost:3000)
npm run build        # Production build
npm start            # Serve the production build
npm run typecheck    # TypeScript compilation (tsc --noEmit)
```

---

## Deployment

Fully compatible with **Vercel / Netlify** (Node serverless functions) or any Node.js-capable host.
Set the same environment variables on the platform (Traccar credentials and the Google API key).
In production the session cookie is marked as `Secure`.
