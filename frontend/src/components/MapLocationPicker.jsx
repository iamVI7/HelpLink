import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// ── Bounds & defaults ──────────────────────────────────────────────────────────
const UP_BOUNDS = [
  [23.8, 77.0],
  [30.4, 84.5],
];
const PRAYAGRAJ_CENTER = [25.4358, 81.8463];

// Fix default marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl:       'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl:     'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// Custom red pin marker
const redIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize:   [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

// ── Location marker + click handler ───────────────────────────────────────────
const LocationMarkerComponent = ({ onLocationSelect, externalPosition }) => {
  const [position, setPosition] = useState(null);

  // Sync external position (from "Use My Location" button)
  useEffect(() => {
    if (externalPosition) {
      setPosition([externalPosition.lat, externalPosition.lng]);
    }
  }, [externalPosition]);

  useMapEvents({
    click(e) {
      const { lat, lng } = e.latlng;
      if (lat < 23.8 || lat > 30.4 || lng < 77.0 || lng > 84.5) {
        alert('Service currently limited to Uttar Pradesh');
        return;
      }
      setPosition([lat, lng]);
      onLocationSelect({ lat, lng });
    },
  });

  return position === null ? null : (
    <Marker position={position} icon={redIcon}>
      <Popup>
        <div style={{ fontFamily: "'DM Sans', sans-serif", textAlign: 'center', padding: '2px 4px' }}>
          <p style={{ fontSize: '11px', fontWeight: 700, color: '#1a1714', marginBottom: 4 }}>
            📍 Selected Location
          </p>
          <p style={{ fontSize: '10px', color: '#78716c', margin: 0 }}>
            {position[0].toFixed(5)}, {position[1].toFixed(5)}
          </p>
        </div>
      </Popup>
    </Marker>
  );
};

// ── Skeleton shimmer ───────────────────────────────────────────────────────────
const MapSkeleton = ({ height }) => (
  <div
    style={{
      height,
      width: '100%',
      borderRadius: '0.75rem',
      background: 'linear-gradient(90deg, #f5f5f4 25%, #ebe9e7 50%, #f5f5f4 75%)',
      backgroundSize: '600px 100%',
      animation: 'mapSkeletonShimmer 1.4s ease-in-out infinite',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'column',
      gap: 8,
    }}
  >
    <style>{`
      @keyframes mapSkeletonShimmer {
        0%   { background-position: -600px 0; }
        100% { background-position: 600px 0; }
      }
      @keyframes mapPulse {
        0%, 100% { opacity: 0.5; transform: scale(1); }
        50%       { opacity: 1;   transform: scale(1.08); }
      }
    `}</style>
    <svg
      style={{ color: '#d4ccc8', animation: 'mapPulse 1.6s ease-in-out infinite' }}
      width="28" height="28" fill="none" stroke="currentColor" viewBox="0 0 24 24"
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
        d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
        d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
    <span style={{ fontSize: '11px', fontWeight: 600, color: '#a8a29e', letterSpacing: '0.04em' }}>
      Loading map…
    </span>
  </div>
);

// ── Main component ─────────────────────────────────────────────────────────────
const MapLocationPicker = ({ onLocationSelect, height = '300px', markerPosition }) => {
  const [defaultPosition, setDefaultPosition] = useState(null);
  const [loading, setLoading] = useState(true);
  const [outOfBounds, setOutOfBounds] = useState(false);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        ({ coords: { latitude, longitude } }) => {
          setDefaultPosition([latitude, longitude]);
          setLoading(false);
        },
        () => {
          setDefaultPosition(PRAYAGRAJ_CENTER);
          setLoading(false);
        }
      );
    } else {
      setDefaultPosition(PRAYAGRAJ_CENTER);
      setLoading(false);
    }
  }, []);

  const handleLocationSelect = async (latlng) => {
    setOutOfBounds(false);
    try {
      const res  = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latlng.lat}&lon=${latlng.lng}&addressdetails=1`
      );
      const data = await res.json();
      const address = data.display_name || `${latlng.lat.toFixed(4)}, ${latlng.lng.toFixed(4)}`;
      onLocationSelect(latlng, address);
    } catch {
      onLocationSelect(latlng, `${latlng.lat.toFixed(4)}, ${latlng.lng.toFixed(4)}`);
    }
  };

  if (loading) return <MapSkeleton height={height} />;

  return (
    <div className="w-full" style={{ fontFamily: "'DM Sans', 'Helvetica Neue', sans-serif" }}>

      {/* Out-of-bounds warning */}
      {outOfBounds && (
        <div
          className="mb-2 flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium"
          style={{ background: 'rgba(217,119,6,0.06)', border: '1px solid rgba(217,119,6,0.2)', color: '#92400e' }}
        >
          <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          </svg>
          Service is currently limited to Uttar Pradesh
        </div>
      )}

      {/* Map container */}
      <div
        style={{ height, position: 'relative', overflow: 'hidden', borderRadius: '0.75rem' }}
        className="w-full"
      >
        {/* Styled border overlay */}
        <div
          style={{
            position: 'absolute', inset: 0, zIndex: 1000,
            borderRadius: '0.75rem',
            border: '1px solid rgba(0,0,0,0.1)',
            pointerEvents: 'none',
          }}
        />

        <MapContainer
          center={defaultPosition ?? PRAYAGRAJ_CENTER}
          zoom={13}
          className="w-full h-full"
          maxBounds={UP_BOUNDS}
          maxBoundsViscosity={1.0}
          minZoom={7}
          style={{ borderRadius: '0.75rem' }}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          />
          <LocationMarkerComponent
            onLocationSelect={handleLocationSelect}
            externalPosition={markerPosition}
          />
        </MapContainer>
      </div>

      {/* Hint */}
      <p
        className="mt-2 flex items-center justify-center gap-1.5"
        style={{ fontSize: '10px', color: '#a8a29e', fontWeight: 500, letterSpacing: '0.02em' }}
      >
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5" />
        </svg>
        Click on the map to pin your location
      </p>

    </div>
  );
};

export default MapLocationPicker;