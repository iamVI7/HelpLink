import {
  MapContainer,
  TileLayer,
  Marker,
  Polyline,
  useMap,
  ZoomControl,
  Tooltip,
} from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import api from '../services/api';
import L from 'leaflet';

// 📍 Geofencing (Uttar Pradesh)
const UP_BOUNDS = [
  [23.8, 77.0],
  [30.4, 84.5]
];

// 📍 Default focus → Prayagraj
const PRAYAGRAJ_CENTER = [25.4358, 81.8463];

// ─────────────────────────────────────────────
// Custom Glow Marker with pulse animation
// ─────────────────────────────────────────────
const createIcon = (color, pulse = false) =>
  new L.DivIcon({
    className: '',
    iconAnchor: [12, 12],
    html: `
      <div style="position: relative; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center;">
        ${pulse ? `
          <div style="
            position: absolute;
            width: 40px; height: 40px;
            border-radius: 50%;
            background: ${color};
            opacity: 0.2;
            animation: pulseRing 2s ease-out infinite;
            top: 50%; left: 50%;
            transform: translate(-50%, -50%);
          "></div>
        ` : ''}
        <div style="
          width: 16px;
          height: 16px;
          background: ${color};
          border-radius: 50%;
          border: 3px solid white;
          box-shadow: 0 2px 8px rgba(0,0,0,0.25);
          position: relative;
          z-index: 1;
        "></div>
      </div>
      <style>
        @keyframes pulseRing {
          0% { transform: translate(-50%, -50%) scale(0.8); opacity: 0.4; }
          100% { transform: translate(-50%, -50%) scale(2); opacity: 0; }
        }
      </style>
    `,
  });

// ─────────────────────────────────────────────
// Auto Fit Map Bounds
// ─────────────────────────────────────────────
const FitBounds = ({ userPos, helperPos }) => {
  const map = useMap();

  useEffect(() => {
    if (userPos && helperPos) {
      map.fitBounds([userPos, helperPos], {
        padding: [80, 80],
      });
    }
  }, [userPos, helperPos, map]);

  return null;
};

// ─────────────────────────────────────────────
// Chaikin smoothing for route coords
// ─────────────────────────────────────────────
const smoothRoute = (coords, iterations = 3) => {
  let pts = coords;
  for (let iter = 0; iter < iterations; iter++) {
    const smooth = [pts[0]];
    for (let i = 0; i < pts.length - 1; i++) {
      const [lat1, lng1] = pts[i];
      const [lat2, lng2] = pts[i + 1];
      smooth.push([0.75 * lat1 + 0.25 * lat2, 0.75 * lng1 + 0.25 * lng2]);
      smooth.push([0.25 * lat1 + 0.75 * lat2, 0.25 * lng1 + 0.75 * lng2]);
    }
    smooth.push(pts[pts.length - 1]);
    pts = smooth;
  }
  return pts;
};

// ─────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────
const MapPage = () => {
  const { id } = useParams();
  const [request, setRequest] = useState(null);
  const [routeCoords, setRouteCoords] = useState([]);
  const [eta, setEta] = useState(null);

  // Fetch request
  useEffect(() => {
    api.get(`/requests/${id}`).then(res => setRequest(res.data));
  }, [id]);

  // Fetch route
  useEffect(() => {
    if (!request?.location || !request?.helper?.location) return;

    const user = request.location.coordinates;
    const helper = request.helper.location.coordinates;

    const userPos = [user[1], user[0]];
    const helperPos = [helper[1], helper[0]];

    const fetchRoute = async () => {
      try {
        const url = `https://router.project-osrm.org/route/v1/driving/${helperPos[1]},${helperPos[0]};${userPos[1]},${userPos[0]}?overview=full&geometries=geojson`;

        const res = await fetch(url);
        const data = await res.json();

        if (data.routes?.length > 0) {
          const raw = data.routes[0].geometry.coordinates.map(
            ([lng, lat]) => [lat, lng]
          );
          setRouteCoords(smoothRoute(raw, 3));

          // Extract ETA in minutes
          const seconds = data.routes[0].duration;
          setEta(Math.ceil(seconds / 60));
        }
      } catch (err) {
        console.error('Route fetch error:', err);
      }
    };

    fetchRoute();
  }, [request]);

  if (!request) {
    return (
      <div style={{
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        background: '#f8f9fb',
        color: '#555',
        fontFamily: 'system-ui, sans-serif',
      }}>
        <div style={{
          width: 36,
          height: 36,
          border: '3px solid #e0e0e0',
          borderTop: '3px solid #2563eb',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <p style={{ margin: 0, fontSize: 14 }}>Loading map…</p>
      </div>
    );
  }

  const user = request.location.coordinates;
  const helper = request.helper.location.coordinates;

  const userPos = [user[1], user[0]];
  const helperPos = [helper[1], helper[0]];

  // 🚫 Block rendering if outside UP (safety)
const isInsideUP = ([lat, lng]) =>
  lat >= 23.8 && lat <= 30.4 && lng >= 77.0 && lng <= 84.5;

if (!isInsideUP(userPos) || !isInsideUP(helperPos)) {
  console.warn("Outside UP bounds — blocked");
}

  return (
    <div style={{ position: 'relative', height: '100vh', width: '100%' }}>

      {/* ───────────── BACK BUTTON ───────────── */}
      <button
        onClick={() => window.history.back()}
        style={{
          position: 'absolute',
          top: 'calc(60px + 16px)',
          left: 16,
          zIndex: 1000,
          background: 'rgba(255,255,255,0.95)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(0,0,0,0.08)',
          padding: '8px 16px',
          borderRadius: '999px',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          fontSize: 13,
          fontWeight: 600,
          color: '#111',
          boxShadow: '0 2px 12px rgba(0,0,0,0.1)',
          cursor: 'pointer',
          transition: 'transform 0.15s',
        }}
        onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.04)'}
        onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
      >
        ← Back
      </button>

      {/* ───────────── STATUS PANEL ───────────── */}
      <div style={{
        position: 'absolute',
        top: 'calc(60px + 16px)',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 1000,
        background: 'rgba(255,255,255,0.97)',
        backdropFilter: 'blur(12px)',
        padding: '10px 20px',
        borderRadius: 16,
        boxShadow: '0 4px 24px rgba(0,0,0,0.12)',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        whiteSpace: 'nowrap',
        border: '1px solid rgba(0,0,0,0.06)',
      }}>
        {/* Animated dot */}
        <div style={{ position: 'relative', width: 12, height: 12, flexShrink: 0 }}>
          <div style={{
            position: 'absolute',
            inset: 0,
            borderRadius: '50%',
            background: '#2563eb',
            opacity: 0.3,
            animation: 'statusPulse 1.8s ease-out infinite',
          }} />
          <div style={{
            position: 'absolute',
            inset: 2,
            borderRadius: '50%',
            background: '#2563eb',
          }} />
        </div>

        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#111', lineHeight: 1.3 }}>
            Helper is on the way
          </div>
          {eta !== null && (
            <div style={{ fontSize: 11, color: '#888', lineHeight: 1.3 }}>
              Estimated arrival: ~{eta} min
            </div>
          )}
        </div>

        <style>{`
          @keyframes statusPulse {
            0% { transform: scale(1); opacity: 0.4; }
            100% { transform: scale(2.8); opacity: 0; }
          }
        `}</style>
      </div>

      {/* ───────────── LEGEND ───────────── */}
      <div style={{
        position: 'absolute',
        bottom: 40,
        left: 16,
        zIndex: 1000,
        background: 'rgba(255,255,255,0.95)',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(0,0,0,0.06)',
        borderRadius: 14,
        padding: '10px 14px',
        boxShadow: '0 2px 12px rgba(0,0,0,0.1)',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
      }}>
        {[
          { color: '#dc2626', label: 'You are here' },
          { color: '#2563eb', label: 'Helper' },
        ].map(({ color, label }) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              width: 10, height: 10,
              borderRadius: '50%',
              background: color,
              border: '2px solid white',
              boxShadow: `0 0 0 1.5px ${color}`,
              flexShrink: 0,
            }} />
            <span style={{ fontSize: 12, color: '#333', fontWeight: 500 }}>{label}</span>
          </div>
        ))}
      </div>

      {/* ───────────── MAP ───────────── */}
      <MapContainer
  center={userPos ?? PRAYAGRAJ_CENTER}
  zoom={13}
  zoomControl={false}
  style={{ height: '100%', width: '100%' }}
  maxBounds={UP_BOUNDS}
  maxBoundsViscosity={1.0}
  minZoom={7}
>
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://carto.com/">CARTO</a>'
        />

        <ZoomControl position="bottomright" />
        <FitBounds userPos={userPos} helperPos={helperPos} />

        {/* User marker — "You are here" */}
        <Marker position={userPos} icon={createIcon('#dc2626', false)}>
          <Tooltip
            permanent
            direction="top"
            offset={[0, -14]}
            className="custom-label"
          >
            <span style={{
              fontSize: 12,
              fontWeight: 600,
              color: '#dc2626',
              background: 'white',
              padding: '4px 10px',
              borderRadius: 999,
              border: '1px solid rgba(220,38,38,0.2)',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              whiteSpace: 'nowrap',
              display: 'block',
            }}>
              You are here
            </span>
          </Tooltip>
        </Marker>

        {/* Helper marker — "Helper is on the way" */}
        <Marker position={helperPos} icon={createIcon('#2563eb', true)}>
          <Tooltip
            permanent
            direction="top"
            offset={[0, -14]}
            className="custom-label"
          >
            <span style={{
              fontSize: 12,
              fontWeight: 600,
              color: '#2563eb',
              background: 'white',
              padding: '4px 10px',
              borderRadius: 999,
              border: '1px solid rgba(37,99,235,0.2)',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              whiteSpace: 'nowrap',
              display: 'block',
            }}>
              Helper is on the way
            </span>
          </Tooltip>
        </Marker>

        {/* Smooth route */}
        {routeCoords.length > 0 && (
          <>
            {/* Outer glow */}
            <Polyline
              positions={routeCoords}
              pathOptions={{
                color: '#bfdbfe',
                weight: 14,
                opacity: 0.5,
                lineCap: 'round',
                lineJoin: 'round',
              }}
            />
            {/* Mid glow */}
            <Polyline
              positions={routeCoords}
              pathOptions={{
                color: '#93c5fd',
                weight: 9,
                opacity: 0.6,
                lineCap: 'round',
                lineJoin: 'round',
              }}
            />
            {/* Main line */}
            <Polyline
              positions={routeCoords}
              pathOptions={{
                color: '#2563eb',
                weight: 4,
                opacity: 1,
                lineCap: 'round',
                lineJoin: 'round',
              }}
            />
          </>
        )}
      </MapContainer>

      {/* Override Leaflet tooltip default styling */}
      <style>{`
        .custom-label {
          background: transparent !important;
          border: none !important;
          box-shadow: none !important;
          padding: 0 !important;
        }
        .custom-label::before {
          display: none !important;
        }
        .leaflet-tooltip {
          font-family: system-ui, -apple-system, sans-serif;
        }
      `}</style>
    </div>
  );
};

export default MapPage;