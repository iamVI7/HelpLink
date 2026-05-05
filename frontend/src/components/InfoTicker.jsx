// ── InfoTicker.jsx ────────────────────────────────────────────────────────────
// Extracted from LandingPage.jsx — scrolling info banner shown below SOS hero.
// Self-contained: includes its own keyframe + CSS class definitions.

const TICKER_ITEMS = [
  { icon: '🚨', text: 'Always call 112 first for life-threatening emergencies — HelpLink is a powerful complement' },
  { icon: '⚡', text: 'Responders are notified within 5 seconds of your SOS being sent' },
  { icon: '📍', text: 'No account needed — anyone can send an SOS instantly from this page' },
  { icon: '🔒', text: 'Your location is never stored — it is shared only with your responder and purged when the emergency ends' },
  { icon: '⏱', text: 'Average community response time is under 3 minutes in urban areas' },
  { icon: '📡', text: 'Offline? Your SOS is saved locally and auto-sent the moment you reconnect' },
  { icon: '📸', text: 'Attaching a photo helps responders arrive fully prepared — faster aid, fewer questions' },
  { icon: '🌐', text: 'HelpLink operates 24 / 7 — responders are active day and night across all zones' },
];

const InfoTicker = () => {
  const doubled = [...TICKER_ITEMS, ...TICKER_ITEMS];
  return (
    <>
      <style>{`
        @keyframes tickerScroll { 0%{transform:translateX(0)} 100%{transform:translateX(-50%)} }
        .ticker-track {
          display: flex;
          flex-direction: row;
          flex-wrap: nowrap;
          width: max-content;
          animation: tickerScroll 60s linear infinite;
          will-change: transform;
        }
        .ticker-track:hover { animation-play-state: paused; }
        .ticker-item {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          padding: 0 24px;
          white-space: nowrap;
          font-size: 0.76rem;
          font-weight: 500;
          color: #57534e;
          letter-spacing: 0.01em;
        }
        .ticker-icon {
          font-size: 0.82rem;
          flex-shrink: 0;
          line-height: 1;
        }
        .ticker-sep {
          display: inline-block;
          width: 3px;
          height: 3px;
          border-radius: 50%;
          background: rgba(220,38,38,0.3);
          flex-shrink: 0;
          margin-left: 8px;
        }
      `}</style>

      <div
        style={{
          overflow: 'hidden',
          width: '100%',
          padding: '10px 0',
          borderTop: '1.5px solid rgba(220,38,38,0.09)',
          borderBottom: '1.5px solid rgba(220,38,38,0.09)',
          background: 'linear-gradient(90deg,rgba(255,245,245,0.94) 0%,rgba(255,255,255,0.97) 50%,rgba(255,245,245,0.94) 100%)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          position: 'relative',
        }}
      >
        {/* Fade edges */}
        <div style={{
          position: 'absolute', top: 0, bottom: 0, left: 0, width: 64, zIndex: 2, pointerEvents: 'none',
          background: 'linear-gradient(to right,rgba(255,245,245,0.96),transparent)',
        }} />
        <div style={{
          position: 'absolute', top: 0, bottom: 0, right: 0, width: 64, zIndex: 2, pointerEvents: 'none',
          background: 'linear-gradient(to left,rgba(255,245,245,0.96),transparent)',
        }} />

        <div className="ticker-track">
          {doubled.map((item, i) => (
            <span key={i} className="ticker-item">
              <span className="ticker-icon">{item.icon}</span>
              {item.text}
              <span className="ticker-sep" />
            </span>
          ))}
        </div>
      </div>
    </>
  );
};

export default InfoTicker;