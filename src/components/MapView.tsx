'use client';

import { useEffect, useRef, useState } from 'react';
import { GoogleMapsOverlay } from '@deck.gl/google-maps';
import type { LayersList } from '@deck.gl/core';
import { IconLayer, PathLayer } from '@deck.gl/layers';
import { Loader } from '@googlemaps/js-api-loader';
import { useVehicleTrip } from '@/hooks/useVehicleTrip';
import { useFleetTrip } from '@/hooks/useFleetTrip';
import type { FleetFrame } from '@/hooks/useFleetTrip';
import { AlertLightbox } from './AlertLightbox';
import type { VehicleFrame } from '@/hooks/useVehicleTrip';
import { useThemeStore } from '@/store/useThemeStore';
import { useAppStore } from '@/store/useAppStore';
import { getVehicleIconUrl } from '@/lib/vehicle';
import type { TraccarDevice, TraccarPosition } from '@/types/traccar';

const DEFAULT_CENTER: [number, number] = [40.4168, -3.7038]; // Madrid
const DEFAULT_ZOOM = 19;
// Offset de +100 px en el eje Y de la vista centrada que sigue al vehículo.
const CAMERA_FOCUS_OFFSET_Y = 100;
// JSON para el tema Oscuro (Dark Mode)
const ESTILO_MAPA_DARK: google.maps.MapTypeStyle[] = [
  { elementType: 'geometry', stylers: [{ color: '#1e1e24' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#a3a3ad' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#151518' }] },
  { featureType: 'administrative', elementType: 'geometry', stylers: [{ color: '#2c2c35' }] },
  { featureType: 'administrative.country', elementType: 'labels.text.fill', stylers: [{ color: '#8f8f9a' }] },
  { featureType: 'landscape', elementType: 'geometry', stylers: [{ color: '#151518' }] },

  // --- Updated POI Styling ---
  { featureType: 'poi', elementType: 'geometry', stylers: [{ color: '#25252d' }] },
  { featureType: 'poi', elementType: 'labels.text.fill', stylers: [{ color: '#5f5f6b' }] },
  { featureType: 'poi', elementType: 'labels.icon', stylers: [{ color: '#384042ff' }, { saturation: -90 }, { lightness: -20 }] },
  { featureType: 'poi.business', elementType: 'all', stylers: [{ color: '#384042ff' }, { saturation: -90 }, { lightness: -20 }] },
  // ---------------------------

  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#2c2c35' }] },
  { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#c4c4cd' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#3a3a45' }] },
  { featureType: 'road.arterial', elementType: 'geometry', stylers: [{ color: '#33333d' }] },
  { featureType: 'transit', elementType: 'geometry', stylers: [{ color: '#2f2f38' }] },
  { featureType: 'transit', elementType: 'labels.text.fill', stylers: [{ color: '#6e6e7a' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0d1b2a' }] },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#33566f' }] }
];

// JSON para el tema Claro (Light Mode)
const ESTILO_MAPA_LIGHT: google.maps.MapTypeStyle[] = [
  { elementType: 'geometry', stylers: [{ color: '#f5f5f7' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#afafafff' }] },
  { featureType: 'administrative.country', elementType: 'labels.text.fill', stylers: [{ color: '#6b7280' }] },
  { featureType: 'landscape', elementType: 'geometry', stylers: [{ color: '#f5f5f7' }] },
  { featureType: 'poi', elementType: 'labels.text.fill', stylers: [{ color: '#9ca3af' }] },


  // --- Updated POI Styling ---
  { featureType: 'poi', elementType: 'labels.text.fill', stylers: [{ color: '#5f5f6b' }] },
  { featureType: 'poi', elementType: 'labels.icon', stylers: [{ color: '#384042ff' }, { saturation: -90 }, { lightness: -20 }] },
  // ---------------------------

  // ELIMINA EL REBORDE DE LAS CALLES AQUÍ:
  { featureType: 'road', elementType: 'labels.text.stroke', stylers: [{ visibility: 'off' }] },

  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#ffffff' }] },
  { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#bbbbbbff' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#e5e7eb' }] },
  { featureType: 'road.arterial', elementType: 'geometry', stylers: [{ color: '#eef0f3' }] },
  { featureType: 'transit', elementType: 'labels.text.fill', stylers: [{ color: '#a9a9a9ff' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#cce1ff' }] },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#4b6d9c' }] },
];

// Claves de Google Maps (los estilos de mapa se aplican por JS: sin mapId,
// porque Google ignora `styles` cuando hay mapId presente).
const GOOGLE_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? '';
const loader = GOOGLE_API_KEY ? new Loader({ apiKey: GOOGLE_API_KEY }) : null;

// Mapeo del atlas (IconLayer): cada PNG es un único icono 858×858.
// El vehículo apunta hacia ARRIBA (norte, heading 0). Como el ángulo
// positivo de deck.gl rota en sentido anti-horario, para orientarlo al
// rumbo real se usa `getAngle = -heading` (arriba→norte = 0, este = −90).
const VEHICLE_ICON_MAPPING = {
  vehicle: { x: 0, y: 0, width: 858, height: 858, anchorX: 429, anchorY: 429, mask: false },
};

interface MapViewProps {
  device: TraccarDevice | null;
  position: TraccarPosition | null;
  positionLoading: boolean;
  /** Modo flota: mostrar todos los vehículos con su última posición. */
  showAll?: boolean;
  fleet?: { device: TraccarDevice; position: TraccarPosition | null }[];
  /** Al hacer click en un vehículo del modo flota, pasar a vista individual. */
  onSelectVehicle?: (deviceId: number) => void;
}

interface HoverInfo {
  x: number;
  y: number;
  name: string;
}

// Devuelve el centro del mapa desplazado +100 px en Y (pantalla) respecto al
// foco (vehículo), de modo que la vista centrada queda compensada ese offset.
function getFollowCenter(
  map: google.maps.Map,
  lat: number,
  lng: number,
): google.maps.LatLng {
  const proj = map.getProjection();
  const zoom = map.getZoom();
  if (!proj || zoom == null) {
    return new google.maps.LatLng(lat, lng);
  }
  const point = proj.fromLatLngToPoint(new google.maps.LatLng(lat, lng));
  if (!point) {
    return new google.maps.LatLng(lat, lng);
  }
  const offsetWorld = CAMERA_FOCUS_OFFSET_Y / Math.pow(2, zoom);
  const next = proj.fromPointToLatLng(
    new google.maps.Point(point.x, point.y + offsetWorld),
    true,
  );
  return next ?? new google.maps.LatLng(lat, lng);
}

export function MapView({
  device,
  position,
  positionLoading,
  showAll = false,
  fleet = [],
  onSelectVehicle,
}: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const overlayRef = useRef<GoogleMapsOverlay | null>(null);
  const firstCenter = useRef(true);
  const fleetFitted = useRef(false);
  const fleetSignature = useRef('');
  const lastCameraState = useRef<{
    center?: google.maps.LatLngLiteral;
    zoom?: number;
  } | null>(null);

  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const [showPaths, setShowPaths] = useState(true);

  const theme = useThemeStore((s) => s.theme);
  const isLight = theme === 'light';

  const vehicleKinds = useAppStore((s) => s.vehicleKinds);

  const hasPosition =
    position != null && position.latitude != null && position.longitude != null;

  // Conducción continua estilo ejemplo deck.gl: accesores estables (refs)
  const { getFrame, getPath } = useVehicleTrip(!showAll && hasPosition ? position : null);

  // Icono del vehículo seleccionado (modo individual)
  const kindOverride = useAppStore((s) => (device ? s.vehicleKinds[device.id] : undefined));
  const vehicleIconUrl = getVehicleIconUrl(device, kindOverride);

  // Marcadores de la flota completa (modo "todos los vehículos"): frames
  // interpolados en tiempo real + url del icono y nombre por dispositivo.
  const fleetTrip = useFleetTrip(
    fleet.map((f) => ({ deviceId: f.device.id, position: f.position })),
    showAll,
  );
  const { getFleetFrames } = fleetTrip;

  const fleetMetaRef = useRef(new Map<number, { name: string; iconUrl: string }>());
  fleetMetaRef.current = new Map(
    fleet.map((entry) => [
      entry.device.id,
      {
        name: entry.device.name,
        iconUrl: getVehicleIconUrl(entry.device, vehicleKinds[entry.device.id]),
      },
    ]),
  );

  // Últimas posiciones estáticas por dispositivo (para encuadrar la flota).
  const fleetPoints: [number, number][] = [];
  for (const entry of fleet) {
    const p = entry.position;
    if (p && p.latitude != null && p.longitude != null) {
      fleetPoints.push([p.longitude, p.latitude]);
    }
  }

  // ---------- Inicialización del mapa (Google Maps + deck.gl) ----------
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    if (!loader) {
      setMapError(
        'Falta NEXT_PUBLIC_GOOGLE_MAPS_API_KEY en .env.local. Añade tu API key y reinicia el servidor.',
      );
      return;
    }

    let cancelled = false;
    let map: google.maps.Map | null = null;
    let overlay: GoogleMapsOverlay | null = null;

    (async () => {
      try {
        const { Map } = await loader.importLibrary('maps');
        if (cancelled) return;

        const savedCamera = lastCameraState.current;
        const center = savedCamera?.center ?? { lng: DEFAULT_CENTER[1], lat: DEFAULT_CENTER[0] };
        const zoom = savedCamera?.zoom ?? DEFAULT_ZOOM;

        const baseOptions: google.maps.MapOptions = {
          center,
          zoom,
          isFractionalZoomEnabled: true,
          disableDefaultUI: true,
          streetViewControl: false,
          // Se aplica el estilo del tema actual; se actualiza en vivo vía
          // map.setOptions() cuando el usuario cambia de tema (efecto abajo).
          styles: isLight ? ESTILO_MAPA_LIGHT : ESTILO_MAPA_DARK,
        };

        map = new Map(container, baseOptions);

        // No-interleaved: canvas DOM propio
        overlay = new GoogleMapsOverlay({ interleaved: true });
        overlay.setMap(map);
        overlayRef.current = overlay;

        // Tooltip al pasar el ratón sobre un vehículo de la flota.
        // `fleetMetaRef` se lee en el momento (ref siempre actualizado).
        overlay.setProps({
          getTooltip: ({ object }: { object?: FleetFrame }) => {
            if (!object) return null;
            const meta = fleetMetaRef.current.get(object.id);
            if (!meta) return null;
            return { text: meta.name, className: 'deck-tooltip' };
          },
        });

        mapRef.current = map;
        setMapReady(true);
      } catch (err) {
        if (!cancelled) {
          console.error('Error cargando Google Maps:', err);
          setMapError('No se pudo cargar Google Maps. Revisa tu API key y que la API de Maps JavaScript esté habilitada.');
        }
      }
    })();

    return () => {
      cancelled = true;
      if (mapRef.current) {
        lastCameraState.current = {
          center: mapRef.current.getCenter()?.toJSON(),
          zoom: mapRef.current.getZoom(),
        };
      }
      overlay?.finalize();
      overlayRef.current = null;
      mapRef.current = null;
      setMapReady(false);
    };
  }, []);

  // ---------- Cambio de tema en vivo (sin remontar el mapa) ----------
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    map.setOptions({
      styles: isLight ? ESTILO_MAPA_LIGHT : ESTILO_MAPA_DARK,
    });
  }, [isLight]);

  // ---------- Bucle de animación: camión 2D + ruta + cámara (cada frame) ----------
  useEffect(() => {
    if (!mapReady) return;

    const accent: [number, number, number] = isLight ? [37, 99, 235] : [96, 165, 250];
    const trailColor: [number, number, number, number] = [...accent, isLight ? 210 : 230];

    let raf = 0;

    const tick = () => {
      try {
        // ---------- Modo flota: todos los vehículos interpolados ----------
        if (showAll) {
          const frames = getFleetFrames();
          const layers: LayersList = frames.map((frame) => {
            const meta = fleetMetaRef.current.get(frame.id);
            return new IconLayer({
              id: `fleet-${frame.id}`,
              data: [frame],
              iconAtlas: meta?.iconUrl ?? vehicleIconUrl,
              iconMapping: VEHICLE_ICON_MAPPING,
              getIcon: () => 'vehicle',
              getPosition: (d: FleetFrame) => d.point,
              getAngle: (d: FleetFrame) => -d.heading,
              sizeUnits: 'pixels',
              sizeScale: 1,
              sizeBasis: 'width',
              getSize: 44,
              pickable: true,
              onClick: (info) => {
                const id = (info?.object as FleetFrame | undefined)?.id;
                if (id != null) onSelectVehicle?.(id);
              },
            });
          });
          overlayRef.current?.setProps({ layers });
          return;
        }

        const frame = getFrame();
        const path = getPath();

        if (frame) {
          const layers: LayersList = [];

          if (showPaths && path.length > 1) {
            layers.push(
              new PathLayer({
                id: 'vehicle-trail',
                data: [{ path }],
                getPath: (d: { path: [number, number][] }) => d.path,
                getColor: trailColor,
                widthUnits: 'pixels',
                width: 8,
                jointRounded: true,
                capRounded: true,
                opacity: 0.8,
                pickable: false,
              }),
            );
          }

          layers.push(
            new IconLayer({
              id: 'vehicle-2d',
              data: [frame],
              iconAtlas: vehicleIconUrl,
              iconMapping: VEHICLE_ICON_MAPPING,
              getIcon: () => 'vehicle',
              getPosition: (d: VehicleFrame) => d.point,
              getAngle: (d: VehicleFrame) => -d.heading,
              sizeUnits: 'pixels',
              sizeScale: 1,
              sizeBasis: 'width',
              getSize: 44,
              pickable: false,
            }),
          );

          overlayRef.current?.setProps({ layers });

          // Cámara siguiendo al vehículo cada frame (siempre activo,
          // independientemente de si el usuario interactúa con el mapa).
          if (mapRef.current) {
            const map = mapRef.current;
            const [lng, lat] = frame.point;
            try {
              map.moveCamera({
                center: getFollowCenter(map, lat, lng),
              });
            } catch (err) {
              console.warn('Google Maps: moveCamera falló.', err);
            }
          }
        }
      } finally {
        raf = requestAnimationFrame(tick);
      }
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapReady, isLight, showPaths, vehicleIconUrl, showAll, fleetPoints.length]);

  // Centrado inicial (sin animación) con el primer fix.
  // Al volver del modo flota al individual, se re-centra en el vehículo.
  useEffect(() => {
    if (showAll) {
      firstCenter.current = true;
      return;
    }
    const map = mapRef.current;
    if (!map) return;
    if (!hasPosition) return;
    if (!firstCenter.current) return;
    firstCenter.current = false;
    map.moveCamera({
      center: {
        lng: (position.longitude as number) ?? 0,
        lat: (position.latitude as number) ?? 0,
      },
      zoom: DEFAULT_ZOOM,
    });
  }, [mapReady, hasPosition, position, showAll]);

  // En modo flota encuadrar todos los vehículos una vez (por dispositivo).
  // Se reencuadra cuando el mapa se monta o cambia la selección.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !showAll) {
      fleetFitted.current = false;
      fleetSignature.current = '';
      return;
    }
    if (fleetPoints.length === 0) {
      fleetFitted.current = false;
      return;
    }

    const signature = fleetPoints.map(([lng, lat]) => `${lng.toFixed(5)},${lat.toFixed(5)}`).join(';');
    if (fleetFitted.current && fleetSignature.current === signature) return;

    const bounds = new google.maps.LatLngBounds();
    for (const [lng, lat] of fleetPoints) {
      bounds.extend({ lat, lng });
    }
    try {
      // Padding generoso para mostrar la ciudad alrededor de los vehículos
      // (zoom-out) y no solo el cluster de iconos.
      map.fitBounds(bounds, { top: 140, bottom: 140, left: 140, right: 140 });
      // Nunca dejar el zoom tan cercano que no se aprecie el entorno.
      const zoom = map.getZoom();
      if (zoom != null && zoom > 15) map.setZoom(15);
    } catch (err) {
      console.warn('Google Maps: fitBounds falló.', err);
    }
    fleetFitted.current = true;
    fleetSignature.current = signature;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapReady, showAll, fleetPoints.length, vehicleKinds]);

  // ---------- Toggles ----------
  const centerOnVehicle = () => {
    const map = mapRef.current;
    if (!map) return;
    if (showAll) {
      if (fleetPoints.length === 0) return;
      const bounds = new google.maps.LatLngBounds();
      for (const [lng, lat] of fleetPoints) {
        bounds.extend({ lat, lng });
      }
      try {
        map.fitBounds(bounds, { top: 140, bottom: 140, left: 140, right: 140 });
        const zoom = map.getZoom();
        if (zoom != null && zoom > 15) map.setZoom(15);
      } catch (err) {
        console.warn('Google Maps: fitBounds falló.', err);
      }
      return;
    }
    const frame = getFrame();
    if (!frame) return;
    try {
      map.moveCamera({
        center: { lat: frame.point[1], lng: frame.point[0] },
        zoom: DEFAULT_ZOOM,
      });
    } catch (err) {
      console.warn('Google Maps: moveCamera falló.', err);
    }
  };

  return (
    <div className="map-shell ai-card-3d" role="region" aria-label="Mapa de ubicación del vehículo">
      <div
        ref={containerRef}
        className={`map-view map-view--${theme}`}
      />

      {mapError && (
        <AlertLightbox title="No se pudo cargar el mapa" body={mapError} onClose={() => setMapError(null)} />
      )}

      {mapReady && (showAll ? fleetPoints.length > 0 : hasPosition && position) && (
        <span className="mesh-pulse" aria-hidden="true" title="Procesando datos en vivo" />
      )}

      <div className="map-tools">
        {!showAll && (
          <button
            type="button"
            className="map-toggle"
            aria-pressed={showPaths}
            aria-label={showPaths ? 'Ocultar ruta del vehículo' : 'Mostrar ruta del vehículo'}
            title={showPaths ? 'Ruta visible' : 'Ruta oculta'}
            onClick={() => setShowPaths((s) => !s)}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="5" cy="19" r="2" />
              <circle cx="19" cy="5" r="2" />
              <path d="M6.5 17.5 17.5 6.5" />
            </svg>
            Ruta
          </button>
        )}
      </div>

      <button
        type="button"
        className="map-fab"
        aria-label={showAll ? 'Encuadrar todos los vehículos' : 'Centrar el mapa en el vehículo'}
        title={showAll ? 'Encuadrar todos los vehículos' : 'Centrar en el vehículo'}
        disabled={showAll ? fleetPoints.length === 0 : !hasPosition}
        onClick={centerOnVehicle}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <circle cx="12" cy="12" r="3" />
          <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
        </svg>
      </button>
    </div>
  );
}
