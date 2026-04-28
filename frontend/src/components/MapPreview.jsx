import { MapContainer, TileLayer, Marker, Polyline, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { useEffect, useState } from 'react';

// 📍 Geofencing (UP)
const UP_BOUNDS = [
  [23.8, 77.0],
  [30.4, 84.5]
];

// 📍 Default focus (Prayagraj)
const PRAYAGRAJ_CENTER = [25.4358, 81.8463];

// ✅ FitBounds OUTSIDE component
const FitBounds = ({ userPos, helperPos }) => {
  const map = useMap();

  useEffect(() => {
    if (userPos && helperPos) {
      map.fitBounds([userPos, helperPos], {
        padding: [30, 30],
      });
    }
  }, [userPos, helperPos, map]);

  return null;
};

const MapPreview = ({ userCoords, helperCoords }) => {
  // ✅ FIX 1: move useState inside component
  const [routeCoords, setRouteCoords] = useState([]);

  if (!userCoords || !helperCoords) return null;

  const userPos = [userCoords.lat, userCoords.lng];
  const helperPos = [helperCoords.lat, helperCoords.lng];

  // ✅ Fetch curved route
  useEffect(() => {
    const fetchRoute = async () => {
      try {
        const url = `https://router.project-osrm.org/route/v1/driving/${userPos[1]},${userPos[0]};${helperPos[1]},${helperPos[0]}?overview=full&geometries=geojson`;

        const res = await fetch(url);
        const data = await res.json();

        if (data.routes && data.routes.length > 0) {
          const coords = data.routes[0].geometry.coordinates.map(
            ([lng, lat]) => [lat, lng]
          );
          setRouteCoords(coords);
        }
      } catch (err) {
        console.error('Route fetch error:', err);
      }
    };

    fetchRoute();
  }, [userPos, helperPos]);

  return (
    <div
      style={{
        height: 120,
        borderRadius: '10px',
        overflow: 'hidden',
      }}
    >
      <MapContainer
  center={userPos ?? PRAYAGRAJ_CENTER}
  zoom={14}
  style={{ height: '100%', width: '100%' }}
  dragging={false}
  zoomControl={false}
  scrollWheelZoom={false}
  doubleClickZoom={false}
  touchZoom={false}
  keyboard={false}
  maxBounds={UP_BOUNDS}
  maxBoundsViscosity={1.0}
  minZoom={7}
>
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

        {/* ✅ Auto camera */}
        <FitBounds userPos={userPos} helperPos={helperPos} />

        {/* ✅ Markers */}
        <Marker position={userPos} />
        <Marker position={helperPos} />

        {/* ✅ Curved route */}
        {routeCoords.length > 0 && (
          <Polyline
            positions={routeCoords}
            pathOptions={{
              color: '#2563eb',
              weight: 4,
            }}
          />
        )}
      </MapContainer>
    </div>
  );
};

export default MapPreview;