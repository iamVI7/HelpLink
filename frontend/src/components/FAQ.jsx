import { useState } from 'react';

// ── FAQ Data ──────────────────────────────────────────────────────────────────
const FAQ_ITEMS = [
  {
    q: 'Who responds when I send an SOS?',
    a: 'Verified HelpLink members within a 5 km radius are instantly notified. These are real people in your community — trained volunteers, off-duty medics, and registered first-aiders — who have opted in to receive emergency alerts near them.',
  },
  {
    q: 'Is my location shared with anyone else?',
    a: 'Your location is shared only with the responder who accepts your request, and only for the duration of the emergency. It is never stored on our servers, sold, or used for any other purpose. Once the request is resolved, the data is purged.',
  },
  {
    q: 'Should I use this instead of calling 112?',
    a: 'No — for life-threatening emergencies always call 112 first. HelpLink is designed to get you community help faster while official services are on their way. Think of it as a powerful complement, not a replacement.',
  },
];

// ── FAQ Component ─────────────────────────────────────────────────────────────
const FAQ = () => {
  const [open, setOpen] = useState(0);

  return (
    <section className="max-w-xl mx-auto px-6 pt-16 pb-6 text-center">
      <div className="flex items-center gap-4 mb-10">
        <span className="uppercase text-[0.65rem] tracking-[0.2em] font-bold text-stone-400 flex-shrink-0">FAQ</span>
        <div className="flex-1 h-px bg-black/[0.09]" />
        <span className="uppercase text-[0.65rem] tracking-[0.2em] font-semibold text-stone-300 flex-shrink-0">Quick answers</span>
      </div>

      <div className="flex flex-col gap-3 text-left">
        {FAQ_ITEMS.map((item, i) => {
          const isOpen = open === i;
          return (
            <div
              key={i}
              className="rounded-2xl overflow-hidden transition-all duration-200"
              style={{
                border: isOpen ? '1.5px solid rgba(220,38,38,0.2)' : '1.5px solid rgba(0,0,0,0.08)',
                background: isOpen
                  ? 'linear-gradient(135deg,#fff5f5 0%,#fff 100%)'
                  : 'rgba(255,255,255,0.85)',
                boxShadow: isOpen
                  ? '0 4px 20px rgba(220,38,38,0.06)'
                  : '0 1px 4px rgba(0,0,0,0.03)',
              }}
            >
              <button
                onClick={() => setOpen(isOpen ? null : i)}
                className="w-full flex items-center justify-between gap-4 px-6 py-5 text-left bg-transparent border-0 cursor-pointer"
              >
                <span
                  className="font-semibold text-[0.95rem] leading-snug"
                  style={{ color: isOpen ? '#dc2626' : '#1a1714' }}
                >
                  {item.q}
                </span>
                <span
                  className="flex-shrink-0 flex items-center justify-center rounded-full transition-all duration-300"
                  style={{
                    width: 28,
                    height: 28,
                    background: isOpen ? 'rgba(220,38,38,0.1)' : 'rgba(0,0,0,0.05)',
                    transform: isOpen ? 'rotate(45deg)' : 'rotate(0deg)',
                  }}
                >
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <line x1="6" y1="1" x2="6" y2="11" stroke={isOpen ? '#dc2626' : '#78716c'} strokeWidth="1.8" strokeLinecap="round" />
                    <line x1="1" y1="6" x2="11" y2="6" stroke={isOpen ? '#dc2626' : '#78716c'} strokeWidth="1.8" strokeLinecap="round" />
                  </svg>
                </span>
              </button>

              <div
                style={{
                  maxHeight: isOpen ? 200 : 0,
                  overflow: 'hidden',
                  transition: 'max-height 0.35s cubic-bezier(0.4,0,0.2,1)',
                }}
              >
                <p className="text-sm leading-relaxed text-stone-500 px-6 pb-5 m-0">
                  {item.a}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};

export default FAQ;