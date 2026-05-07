import React, { useEffect, useState } from 'react';

const formatDate = (str) => {
  if (!str) return '—';
  return new Date(str).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

const EvidenceModal = ({ open, onClose, request, UrgencyBadge, StatusBadge, TypeBadge }) => {
  const [activeIdx, setActiveIdx] = useState(0);
  useEffect(() => { if (open) setActiveIdx(0); }, [open, request]);
  useEffect(() => {
    if (!open) return;
    const h = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [open, onClose]);

  if (!open || !request) return null;
  const images = request.media?.images?.filter(img => img.url) || [];
  // BASE_URL removed — img.url is now a full Cloudinary URL

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{ backgroundColor: 'rgba(26,23,20,0.65)', backdropFilter: 'blur(8px)' }}
      onClick={onClose}
    >
      <div
        className="bg-white border border-stone-200 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden"
        style={{ animation: 'modalIn 0.18s ease both', maxHeight: '88vh', display: 'flex', flexDirection: 'column' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="px-6 pt-5 pb-4 border-b border-stone-100 flex items-start justify-between gap-3 shrink-0">
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-[0.18em] font-bold text-stone-400 mb-1">Incident Evidence</p>
            <h3 className="text-base text-stone-900 leading-snug truncate" style={{ fontFamily: "'Fraunces', Georgia, serif" }}>
              {request.title ?? 'Untitled Request'}
            </h3>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors shrink-0">
            <svg className="w-4 h-4" viewBox="0 0 16 16" fill="currentColor">
              <path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z"/>
            </svg>
          </button>
        </div>
        <div className="px-6 py-3 border-b border-stone-100 flex items-center gap-2 flex-wrap shrink-0">
          <TypeBadge type={request.type} isSOS={request.isSOS} />
          <UrgencyBadge level={request.urgency} />
          <StatusBadge status={request.status} />
          {request.createdBy?.name && <span className="text-[10px] text-stone-400 font-medium">by {request.createdBy.name}</span>}
          <span className="text-[10px] text-stone-400 font-medium ml-auto shrink-0">{formatDate(request.createdAt)}</span>
        </div>
        <div className="overflow-y-auto flex-1 px-6 py-5">
          {request.description && (
            <div className="mb-5">
              <p className="text-[10px] uppercase tracking-[0.14em] font-bold text-stone-400 mb-1.5">Description</p>
              <p className="text-sm text-stone-700 leading-relaxed">{request.description}</p>
            </div>
          )}
          {request.address && (
            <div className="mb-5">
              <p className="text-[10px] uppercase tracking-[0.14em] font-bold text-stone-400 mb-1.5">Location</p>
              <p className="text-sm text-stone-600">📍 {request.address}</p>
            </div>
          )}
          <div>
            <p className="text-[10px] uppercase tracking-[0.14em] font-bold text-stone-400 mb-3">
              Evidence Images
              <span className="ml-2 normal-case font-semibold text-stone-300">({images.length} {images.length === 1 ? 'image' : 'images'})</span>
            </p>
            {images.length === 0 ? (
              <div className="py-12 flex flex-col items-center justify-center border border-dashed border-stone-200 rounded-xl bg-stone-50">
                <span className="text-3xl mb-2 opacity-20">📷</span>
                <p className="text-xs text-stone-400 italic">No evidence images uploaded</p>
              </div>
            ) : (
              <>
                <div className="relative rounded-xl overflow-hidden border border-stone-200 bg-stone-50 mb-3" style={{ aspectRatio: '16/9' }}>
                  <img src={images[activeIdx].url} alt={`Evidence ${activeIdx + 1}`} className="w-full h-full object-contain" />
                  <a href={images[activeIdx].url} target="_blank" rel="noopener noreferrer"
                    className="absolute top-2 right-2 flex items-center gap-1 px-2 py-1 rounded-lg bg-black/50 text-white text-[10px] font-bold uppercase tracking-widest hover:bg-black/70 transition-colors">
                    Full Size
                  </a>
                  {images.length > 1 && <>
                    <button onClick={() => setActiveIdx(i => (i - 1 + images.length) % images.length)}
                      className="absolute left-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-lg bg-black/40 hover:bg-black/60 text-white flex items-center justify-center transition-colors">‹</button>
                    <button onClick={() => setActiveIdx(i => (i + 1) % images.length)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-lg bg-black/40 hover:bg-black/60 text-white flex items-center justify-center transition-colors">›</button>
                    <div className="absolute bottom-2 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full bg-black/40 text-white text-[10px] font-bold">{activeIdx + 1} / {images.length}</div>
                  </>}
                </div>
                {images.length > 1 && (
                  <div className="flex gap-2 flex-wrap">
                    {images.map((img, idx) => (
                      <button key={idx} onClick={() => setActiveIdx(idx)}
                        className="w-14 h-14 rounded-lg overflow-hidden border-2 transition-all shrink-0"
                        style={{ borderColor: idx === activeIdx ? '#1a1714' : 'transparent' }}>
                        <img src={img.url} alt={`Thumb ${idx + 1}`} className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
        <div className="px-6 py-4 border-t border-stone-100 shrink-0">
          <button onClick={onClose} className="w-full px-4 py-2.5 border border-stone-200 text-stone-600 text-xs font-semibold tracking-wide uppercase rounded-xl hover:bg-stone-50 transition-colors">
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default EvidenceModal;