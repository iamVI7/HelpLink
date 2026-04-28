import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getMyRequests, getMyAcceptedRequests } from '../../services/api';

// ─────────────────────────────────────────────────────────────────────────────
// ActivitySummary
//
// Lightweight widget for the Profile page.
// Fetches ONLY counts — does not load full request data.
// Full activity (cards, filters, rating) lives at /dashboard.
// ─────────────────────────────────────────────────────────────────────────────

const ActivitySummary = () => {
  const navigate = useNavigate();
  const [counts, setCounts] = useState({ requests: null, helps: null });
  const [error, setError]   = useState(false);
  const didFetch = useRef(false);

  useEffect(() => {
    if (didFetch.current) return;
    didFetch.current = true;

    const load = async () => {
      try {
        const [reqRes, helpRes] = await Promise.all([
          getMyRequests(),
          getMyAcceptedRequests(),
        ]);
        // handle both { data: [...] } and { data: { requests: [...] } } shapes
        const toArr = (res) => {
          const d = res.data;
          if (Array.isArray(d)) return d;
          if (Array.isArray(d?.requests)) return d.requests;
          return [];
        };
        setCounts({
          requests: toArr(reqRes).length,
          helps:    toArr(helpRes).length,
        });
      } catch {
        setError(true);
      }
    };
    load();
  }, []);

  const loading = counts.requests === null && !error;

  const cards = [
    {
      value:  counts.requests,
      label:  'Requests Made',
      icon:   '📋',
      color:  '#dc2626',
      bg:     'rgba(220,38,38,0.04)',
      border: 'rgba(220,38,38,0.12)',
    },
    {
      value:  counts.helps,
      label:  'Helps Given',
      icon:   '🤝',
      color:  '#16a34a',
      bg:     'rgba(22,163,74,0.04)',
      border: 'rgba(22,163,74,0.12)',
    },
  ];

  return (
    <div>
      {/* Section label */}
      <div className="flex items-center gap-3 mb-4">
        <span className="text-[10px] uppercase tracking-[0.18em] text-stone-400 font-bold whitespace-nowrap">
          Activity
        </span>
        <div className="flex-1 h-px bg-stone-100" />
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        {cards.map((card, i) => (
          <div
            key={i}
            className="rounded-2xl p-5 flex flex-col gap-3"
            style={{
              background: card.bg,
              border: `1px solid ${card.border}`,
            }}
          >
            <span style={{ fontSize: '1.2rem', opacity: 0.75 }}>{card.icon}</span>

            {/* Count */}
            <div
              className="text-4xl font-bold leading-none"
              style={{
                fontFamily: "'DM Serif Display', Georgia, serif",
                color: loading || error ? '#d6d3d1' : card.color,
              }}
            >
              {loading ? (
                <span
                  className="inline-block w-10 h-9 rounded-lg animate-pulse"
                  style={{ background: '#e7e5e4' }}
                />
              ) : error ? (
                '—'
              ) : (
                card.value
              )}
            </div>

            <div className="text-[10px] uppercase tracking-widest text-stone-400 font-semibold leading-tight">
              {card.label}
            </div>
          </div>
        ))}
      </div>

      {/* CTA — View Full Activity */}
      <button
        onClick={() => navigate('/dashboard')}
        className="w-full flex items-center justify-between px-5 py-3.5 rounded-xl border border-stone-200 bg-white hover:bg-stone-50 hover:border-stone-300 transition-all group"
      >
        <div className="flex items-center gap-2.5">
          <span className="text-base">📊</span>
          <span className="text-[11px] uppercase tracking-[0.14em] font-bold text-stone-600 group-hover:text-stone-900 transition-colors">
            View Full Activity
          </span>
        </div>
        <span className="text-stone-400 group-hover:text-stone-700 group-hover:translate-x-0.5 transition-all inline-block">
          →
        </span>
      </button>

      {error && (
        <p className="text-[10px] text-stone-300 text-center mt-3">
          Could not load activity — check your connection.
        </p>
      )}
    </div>
  );
};

export default ActivitySummary;