/**
 * ActivitySummary.jsx — AdminDashboard Design Match
 *
 * Uses StatPill pattern from AdminDashboard for counts,
 * content-card for CTA, Fraunces for section header.
 *
 * ✅ All logic / API calls / navigation unchanged
 */

import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getMyRequests, getMyAcceptedRequests } from '../../services/api';

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
        const toArr = (res) => {
          const d = res.data;
          if (Array.isArray(d)) return d;
          if (Array.isArray(d?.requests)) return d.requests;
          return [];
        };
        setCounts({ requests: toArr(reqRes).length, helps: toArr(helpRes).length });
      } catch {
        setError(true);
      }
    };
    load();
  }, []);

  const loading = counts.requests === null && !error;

  return (
    <div>
      {/* Section label — matches AdminDashboard SectionLabel */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <h2
          style={{
            fontFamily: "'Fraunces', Georgia, serif",
            fontSize: '1rem', fontWeight: 600,
            color: '#1c1917', letterSpacing: '-0.01em', margin: 0,
          }}
        >
          Activity
        </h2>
      </div>

      {/* Stat pills — matches AdminDashboard StatPill style */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 16 }}>

        {/* Requests */}
        <div
          style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '10px 18px', borderRadius: 999,
            border: '1px solid rgba(220,38,38,0.18)',
            background: '#fef2f2',
            transition: 'transform 0.15s, box-shadow 0.15s',
            cursor: 'default',
          }}
          onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)'; }}
          onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = ''; }}
        >
          <span style={{ fontSize: '1.1rem', opacity: 0.7 }}>📋</span>
          <span
            style={{
              fontFamily: "'Fraunces', Georgia, serif",
              fontSize: '1.25rem', fontWeight: 600, lineHeight: 1,
              color: loading || error ? '#d6d3d1' : '#dc2626',
            }}
          >
            {loading ? (
              <span style={{ display: 'inline-block', width: 24, height: 22, borderRadius: 6, background: '#fee2e2', verticalAlign: 'middle' }} />
            ) : error ? '—' : counts.requests}
          </span>
          <span style={{ fontSize: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.14em', fontWeight: 700, color: '#a8a29e' }}>
            Requests Made
          </span>
        </div>

        {/* Helps */}
        <div
          style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '10px 18px', borderRadius: 999,
            border: '1px solid rgba(22,163,74,0.18)',
            background: '#f0fdf4',
            transition: 'transform 0.15s, box-shadow 0.15s',
            cursor: 'default',
          }}
          onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)'; }}
          onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = ''; }}
        >
          <span style={{ fontSize: '1.1rem', opacity: 0.7 }}>🤝</span>
          <span
            style={{
              fontFamily: "'Fraunces', Georgia, serif",
              fontSize: '1.25rem', fontWeight: 600, lineHeight: 1,
              color: loading || error ? '#d6d3d1' : '#16a34a',
            }}
          >
            {loading ? (
              <span style={{ display: 'inline-block', width: 24, height: 22, borderRadius: 6, background: '#dcfce7', verticalAlign: 'middle' }} />
            ) : error ? '—' : counts.helps}
          </span>
          <span style={{ fontSize: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.14em', fontWeight: 700, color: '#a8a29e' }}>
            Helps Given
          </span>
        </div>
      </div>

      {/* CTA — View Full Activity, matches content-card button style */}
      <div className="content-card" style={{ borderRadius: 16, overflow: 'hidden' }}>
        <button
          onClick={() => navigate('/dashboard')}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '14px 20px', background: 'transparent', border: 'none', cursor: 'pointer',
            transition: 'background 0.12s',
          }}
          onMouseEnter={e => (e.currentTarget.style.background = '#faf9f7')}
          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: '0.9rem' }}>📊</span>
            <span style={{
              fontSize: '0.62rem', textTransform: 'uppercase',
              letterSpacing: '0.14em', fontWeight: 700, color: '#78716c',
            }}>
              View Full Activity
            </span>
          </div>
          <span style={{ color: '#c7c4bf', fontSize: '0.85rem' }}>→</span>
        </button>
      </div>

      {error && (
        <p style={{ fontSize: '0.62rem', color: '#d6d3d1', textAlign: 'center', marginTop: 10 }}>
          Could not load activity — check your connection.
        </p>
      )}
    </div>
  );
};

export default ActivitySummary;