# Funcionalidad reciente — Modos Real y Demo

## Doble modo de datos (Real y Demo)

La aplicación soporta **dos modos de funcionamiento**, intercambiables desde la interfaz:

### Modo Real (por defecto)
- Conexión directa con un servidor Traccar (`https://demo4.traccar.org`) mediante un **proxy de autenticación** en `src/app/api/traccar/` — las credenciales nunca se exponen al navegador.
- **Login automático** al iniciar usando las variables `TRACCAR_EMAIL` / `TRACCAR_PASSWORD` de `.env.local` (o login manual si falla).
- **Flujo completo de datos en vivo**:
  1. `POST /api/session` → autenticación.
  2. `GET /api/devices` → lista de vehículos.
  3. `GET /api/positions` → posicionamiento en vivo con polling (React Query).
- Verificado de punta a punta con un dispositivo real (teléfono con Traccar Client reportando GPS).

### Modo Demo (toggle en la UI)
- Datos simulados que circulan por calles reales de Madrid (rutas, velocidad, rumbo).
- Funciona sin servidor ni credenciales, como respaldo para presentar la app.
- Los vehículos demo detectan su tipo automáticamente (Furgón → furgón, Camión → camión, Moto → moto).

## Corrección: detección del tipo de vehículo con tildes

**Problema detectado:** los vehículos demo con tildes (`Furgón`, `Camión`) se mostraban con el icono de auto (`car`), porque el regex de detección buscaba `furgon` / `camion` sin tilde.

**Solución:** normalizar diacríticos antes de comparar (`src/lib/vehicle.ts`) con `normalize('NFD')` + eliminación de marcas de acentuación. Resultado:

- `Furgón A-401` → furgón (`van`)
- `Camión B-207` → camión (`truck`)
- `Moto C-118` → moto (`motorcycle`)

La misma lógica funciona en modo real para cualquier nombre de dispositivo con acentos.
