import { Marker, Tooltip } from 'react-leaflet';
import L from 'leaflet';

// ── Inject styles once into <head> ────────────────────────────────────────────
const STYLES = `
  .nearby-marker-wrapper {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 3px;
    position: relative;
  }

  .nearby-marker__circle {
    width: 36px;
    height: 36px;
    border-radius: 50%;
    border: 2.5px solid #ffffff;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.22);
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: 'DM Sans', 'Helvetica Neue', sans-serif;
    font-size: 15px;
    font-weight: 700;
    color: #ffffff;
    user-select: none;
  }

  .nearby-marker__circle--active {
    background-color: #15803d;
  }

  .nearby-marker__circle--admin {
    background-color: #7c3aed; /* purple */
  }

  .nearby-marker__circle--inactive {
    background-color: #9ca3af;
  }

  .nearby-marker--nearest .nearby-marker__circle {
    animation: nearestPulse 1.8s ease-out infinite;
  }

  @keyframes nearestPulse {
    0%   { box-shadow: 0 0 0 0    rgba(21, 128, 61, 0.55); }
    70%  { box-shadow: 0 0 0 10px rgba(21, 128, 61, 0);    }
    100% { box-shadow: 0 0 0 0    rgba(21, 128, 61, 0);    }
  }

  .nearby-marker__distance {
    background: #ffffff;
    color: #374151;
    font-family: 'DM Sans', 'Helvetica Neue', sans-serif;
    font-size: 10px;
    font-weight: 600;
    padding: 1px 6px;
    border-radius: 999px;
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.18);
    white-space: nowrap;
    letter-spacing: 0.02em;
  }

  .nearby-marker__badge {
    background: #15803d;
    color: #ffffff;
    font-family: 'DM Sans', 'Helvetica Neue', sans-serif;
    font-size: 9px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    padding: 1px 6px;
    border-radius: 999px;
    white-space: nowrap;
  }

  /* ✅ NEW: Verified badge on map marker */
  .nearby-marker__verified {
    background: #dcfce7;
    color: #15803d;
    border: 1px solid #bbf7d0;
    font-family: 'DM Sans', 'Helvetica Neue', sans-serif;
    font-size: 9px;
    font-weight: 700;
    letter-spacing: 0.08em;
    padding: 1px 6px;
    border-radius: 999px;
    white-space: nowrap;
    display: flex;
    align-items: center;
    gap: 2px;
  }
`;

if (typeof document !== 'undefined' && !document.getElementById('nearby-marker-styles')) {
  const tag = document.createElement('style');
  tag.id = 'nearby-marker-styles';
  tag.textContent = STYLES;
  document.head.appendChild(tag);
}

// ── Haversine distance (metres) ───────────────────────────────────────────────
export const haversineDistance = (lat1, lng1, lat2, lng2) => {
  const R     = 6371000;
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat  = toRad(lat2 - lat1);
  const dLng  = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

// ── Format metres → "300 m" or "1.4 km" ──────────────────────────────────────
export const formatDistance = (metres) => {
  if (metres < 1000) return `${Math.round(metres)} m`;
  return `${(metres / 1000).toFixed(1)} km`;
};

// ── Build Leaflet divIcon ─────────────────────────────────────────────────────
const buildUserIcon = (initial, distanceLabel, isNearest, isActive, role, isVerified) =>
  L.divIcon({
    className: '',
    html: `
      <div class="nearby-marker-wrapper${isNearest ? ' nearby-marker--nearest' : ''}">
        <div class="nearby-marker__circle ${
          role === 'admin'
            ? 'nearby-marker__circle--admin'
            : isActive
              ? 'nearby-marker__circle--active'
              : 'nearby-marker__circle--inactive'
        }">
          ${initial}
        </div>
        <div class="nearby-marker__distance">${distanceLabel}</div>
        ${role === 'admin' ? '<div class="nearby-marker__badge">ADMIN</div>' : ''}
        ${isNearest && role !== 'admin' ? '<div class="nearby-marker__badge">Nearest</div>' : ''}
        ${isVerified && role !== 'admin'
          ? '<div class="nearby-marker__verified">✔ Verified</div>'
          : ''}
      </div>
    `,
    iconSize:    [44, isVerified ? 78 : 56],
    iconAnchor:  [22, isVerified ? 72 : 56],
    popupAnchor: [0, isVerified ? -74 : -58],
  });

// ── Component ─────────────────────────────────────────────────────────────────
const NearbyUserMarker = ({ user, currentLat, currentLng, isNearest }) => {
  if (user.role === 'admin') return null;
  const [userLng, userLat] = user.location.coordinates;

  const distanceMetres = haversineDistance(currentLat, currentLng, userLat, userLng);
  const distanceLabel  = formatDistance(distanceMetres);
  const initial        = user.name?.[0]?.toUpperCase() ?? '?';

  const icon = buildUserIcon(
    initial,
    distanceLabel,
    isNearest,
    user.isAvailable,
    user.role || 'user',
    user.isVerified || false  // ✅ NEW — safe: falsy if field absent
  );

  return (
    <Marker position={[userLat, userLng]} icon={icon}>
      <Tooltip direction="top" offset={[0, -60]} opacity={1}>
        <span style={{
          fontFamily: "'DM Sans', sans-serif",
          fontSize: 12,
          fontWeight: 600,
        }}>
          {user.name} · {distanceLabel}
          {user.isVerified ? ' ✔' : ''}
        </span>
      </Tooltip>
    </Marker>
  );
};

export default NearbyUserMarker;