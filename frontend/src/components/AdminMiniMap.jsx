import React, { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { useRequests } from '../context/RequestContext';
import 'leaflet/dist/leaflet.css';

// 📍 Geofencing — Prayagraj only (tight bounding box, matches MapView exactly)
const PRAYAGRAJ_BOUNDS = [
  [25.30, 81.70],
  [25.55, 82.00],
];

// 📍 Default center — Prayagraj
const PRAYAGRAJ_CENTER = [25.4358, 81.8463];

// Fix default marker icons — unchanged
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl:       'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl:     'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// ── Marker icons — matches MapView's getMarkerIcon exactly ───────────────────
const getMarkerIcon = (req) => {
  if (req.isSOS) {
    return L.divIcon({
      className: '',
      html: `
        <div style="display:flex;flex-direction:column;align-items:center;gap:4px;">
          <div style="
            background:#fff; border-radius:50%;
            width:42px; height:42px;
            display:flex; align-items:center; justify-content:center;
            box-shadow:0 2px 12px rgba(220,38,38,0.35),0 1px 4px rgba(0,0,0,0.12);
            border:2px solid #fecaca; font-size:20px;
            animation:sosPulse 1s ease-out infinite;
          ">🚨</div>
          <div style="
            background:#fff; border-radius:20px; padding:2px 8px;
            font-size:10px; font-weight:700; color:#dc2626;
            box-shadow:0 1px 4px rgba(0,0,0,0.12); white-space:nowrap;
            font-family:'DM Sans',sans-serif; letter-spacing:0.02em;
          ">SOS</div>
        </div>`,
      iconSize:    [42, 64],
      iconAnchor:  [21, 64],
      popupAnchor: [0, -66],
    });
  }

  if (req.status === 'accepted') {
    return L.divIcon({
      className: '',
      html: `
        <div style="display:flex;flex-direction:column;align-items:center;gap:4px;">
          <div style="
            background:#fff; border-radius:50%;
            width:38px; height:38px;
            display:flex; align-items:center; justify-content:center;
            box-shadow:0 2px 10px rgba(37,99,235,0.3),0 1px 4px rgba(0,0,0,0.1);
            border:2px solid #bfdbfe; font-size:16px;
          ">✓</div>
          <div style="
            background:#fff; border-radius:20px; padding:2px 8px;
            font-size:10px; font-weight:700; color:#2563eb;
            box-shadow:0 1px 4px rgba(0,0,0,0.1); white-space:nowrap;
            font-family:'DM Sans',sans-serif;
          ">Accepted</div>
        </div>`,
      iconSize:    [38, 62],
      iconAnchor:  [19, 62],
      popupAnchor: [0, -64],
    });
  }

  const cfg = {
    high:   { color: '#dc2626', border: '#fecaca', label: 'Urgent' },
    medium: { color: '#d97706', border: '#fde68a', label: 'Medium' },
    low:    { color: '#16a34a', border: '#bbf7d0', label: 'Low'    },
  };
  const c = cfg[req.urgency] ?? cfg.low;

  return L.divIcon({
    className: '',
    html: `
      <div style="display:flex;flex-direction:column;align-items:center;gap:4px;">
        <div style="
          background:#fff; border-radius:50%;
          width:36px; height:36px;
          display:flex; align-items:center; justify-content:center;
          box-shadow:0 2px 8px rgba(0,0,0,0.14),0 1px 3px rgba(0,0,0,0.08);
          border:2px solid ${c.border};
          font-size:15px; font-weight:800; color:${c.color};
          font-family:'DM Sans',sans-serif;
        ">!</div>
        <div style="
          background:#fff; border-radius:20px; padding:2px 8px;
          font-size:10px; font-weight:700; color:${c.color};
          box-shadow:0 1px 4px rgba(0,0,0,0.1); white-space:nowrap;
          font-family:'DM Sans',sans-serif;
        ">${c.label}</div>
      </div>`,
    iconSize:    [36, 60],
    iconAnchor:  [18, 60],
    popupAnchor: [0, -62],
  });
};

// Urgency badge config — matches MapView
const urgencyConfig = {
  high:   { label: 'HIGH',   textCls: 'text-red-600',    borderCls: 'border-red-200',    bgCls: 'bg-red-50'    },
  medium: { label: 'MEDIUM', textCls: 'text-yellow-700', borderCls: 'border-yellow-200', bgCls: 'bg-yellow-50' },
  low:    { label: 'LOW',    textCls: 'text-green-700',  borderCls: 'border-green-200',  bgCls: 'bg-green-50'  },
};

const AdminMiniMap = () => {
  const { allRequests } = useRequests();
  const mapRef = useRef(null);

  // 🔥 AUTO ZOOM — flies to the latest request whenever allRequests changes
  useEffect(() => {
    if (!mapRef.current || allRequests.length === 0) return;

    const latest = allRequests[0];
    if (!latest?.location?.coordinates) return;

    const [lng, lat] = latest.location.coordinates;

    const map = mapRef.current;
    setTimeout(() => {
      map.flyTo([lat, lng], 15, { duration: 1.2 });
    }, 150);
  }, [allRequests]);

  return (
    <div className="relative w-full">
      {/* Global keyframes — SOS pulse + tile fade */}
      <style>{`
        @keyframes sosPulse {
          0%   { box-shadow: 0 0 0 0   rgba(220,38,38,0.5); }
          70%  { box-shadow: 0 0 0 10px rgba(220,38,38,0);  }
          100% { box-shadow: 0 0 0 0   rgba(220,38,38,0);   }
        }

        /* ── Leaflet chrome — same treatment as MapView ── */
        .helplink-map .leaflet-control-attribution {
          background: rgba(255,255,255,0.72) !important;
          backdrop-filter: blur(4px);
          border-radius: 6px 0 0 0 !important;
          font-size: 9px !important;
          color: #a8a29e !important;
          padding: 2px 6px !important;
          border: none !important;
          box-shadow: none !important;
        }
        .helplink-map .leaflet-control-attribution a { color: #d4a574 !important; }

        .helplink-map .leaflet-control-zoom {
          border: 1px solid rgba(0,0,0,0.08) !important;
          border-radius: 12px !important;
          overflow: hidden;
          box-shadow: 0 2px 8px rgba(0,0,0,0.08) !important;
        }
        .helplink-map .leaflet-control-zoom a {
          background: rgba(255,255,255,0.92) !important;
          color: #44403c !important;
          border: none !important;
          border-bottom: 1px solid rgba(0,0,0,0.06) !important;
          font-size: 16px !important;
          line-height: 30px !important;
          width: 30px !important;
          height: 30px !important;
          font-weight: 400 !important;
          transition: background 0.15s !important;
        }
        .helplink-map .leaflet-control-zoom a:last-child { border-bottom: none !important; }
        .helplink-map .leaflet-control-zoom a:hover { background: #fff7f0 !important; color: #dc2626 !important; }

        .helplink-map .leaflet-tile { transition: opacity 0.35s ease !important; }

        .helplink-map .leaflet-popup-content-wrapper {
          border-radius: 18px !important;
          padding: 0 !important;
          box-shadow: 0 12px 40px rgba(0,0,0,0.10), 0 2px 8px rgba(0,0,0,0.06) !important;
          border: 1px solid rgba(240,238,236,0.9) !important;
          overflow: hidden !important;
        }
        .helplink-map .leaflet-popup-close-button { display: none !important; }
        .helplink-map .leaflet-popup-content       { margin: 0 !important; width: auto !important; }
        .helplink-map .leaflet-popup-tip-container { display: none !important; }
        .helplink-map .leaflet-fade-anim .leaflet-popup { transition: opacity 0.2s ease !important; }

        /* Match MapView — hide default zoom controls (zoom shown via zoomControl prop) */
        .helplink-map .leaflet-control-zoom { display: block !important; }
      `}</style>

      <div
        className="helplink-map w-full rounded-2xl overflow-hidden border border-black/[0.07] shadow-sm relative"
        style={{ height: 360 }}
      >
        <MapContainer
          ref={mapRef}
          center={PRAYAGRAJ_CENTER}
          zoom={13}
          style={{ height: '100%', width: '100%', background: '#f5f0eb' }}
          zoomControl={true}
          maxBounds={PRAYAGRAJ_BOUNDS}
          maxBoundsViscosity={1.0}
          minZoom={11}
          maxZoom={18}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            maxZoom={19}
          />

          {allRequests.map((req) => {
            if (!req?.location?.coordinates) return null;
            const urg = urgencyConfig[req.urgency] ?? urgencyConfig.low;

            return (
              <Marker
                key={req._id}
                position={[
                  req.location.coordinates[1],
                  req.location.coordinates[0],
                ]}
                icon={getMarkerIcon(req)}
              >
                <Popup closeButton={false}>
                  <div
                    style={{
                      fontFamily: "'DM Sans',sans-serif",
                      width: 230,
                      padding: '14px 16px',
                    }}
                  >
                    {/* Urgency + category badges */}
                    <div className="flex gap-1.5 mb-2.5">
                      <span
                        className={`inline-block border px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest rounded-full ${urg.textCls} ${urg.bgCls} ${urg.borderCls}`}
                      >
                        {urg.label}
                      </span>
                      {req.category && (
                        <span className="inline-block border border-stone-200 bg-stone-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest rounded-full text-stone-500">
                          {req.category}
                        </span>
                      )}
                    </div>

                    {/* Title */}
                    <h3
                      className="font-bold text-stone-900 text-[15px] leading-snug mb-1.5"
                      style={{ margin: 0 }}
                    >
                      {req.title}
                    </h3>

                    {/* Description */}
                    {req.description && (
                      <p className="text-xs text-stone-500 leading-relaxed mb-3 line-clamp-2">
                        {req.description}
                      </p>
                    )}

                    {/* Footer */}
                    <div className="border-t border-stone-100 pt-2.5">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <p className="text-[11px] text-stone-400 font-semibold">
                          {req.createdBy?.name}
                        </p>
                        {req.createdBy?.isVerified && (
                          <span className="text-[10px] text-green-600 font-bold">✔</span>
                        )}
                      </div>
                      <p className="text-[11px] text-stone-300">
                        {new Date(req.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>

        {/* Subtle inner vignette — original */}
        <div
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none z-[500] rounded-2xl"
          style={{ boxShadow: 'inset 0 0 32px rgba(245,240,235,0.45)' }}
        />
      </div>
    </div>
  );
};

export default AdminMiniMap;