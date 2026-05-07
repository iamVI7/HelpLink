import React, { useEffect, useState } from 'react';

const WarnModal = ({ open, onClose, onConfirm, loading }) => {
  const [message, setMessage] = useState('');
  useEffect(() => { if (open) setMessage(''); }, [open]);
  useEffect(() => {
    if (!open) return;
    const h = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{ backgroundColor: 'rgba(26,23,20,0.5)', backdropFilter: 'blur(6px)' }}
      onClick={onClose}
    >
      <div
        className="bg-white border border-stone-200 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden"
        style={{ animation: 'modalIn 0.18s ease both' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="px-6 pt-6 pb-5 border-b border-stone-100">
          <p className="text-[10px] uppercase tracking-[0.18em] font-bold text-amber-600 mb-3">Issue Warning</p>
          <h2 className="text-lg text-stone-900 leading-snug" style={{ fontFamily: "'Fraunces', Georgia, serif", letterSpacing: '-0.01em' }}>
            Issue a Warning
          </h2>
        </div>
        <div className="px-6 py-5">
          <label className="block text-[10px] font-bold uppercase tracking-[0.14em] text-stone-400 mb-2">Warning Message</label>
          <textarea
            rows={4} value={message} onChange={(e) => setMessage(e.target.value)}
            placeholder="Describe the reason for this warning…"
            className="w-full border border-stone-200 rounded-xl px-4 py-3 text-sm text-stone-900 placeholder-stone-300 focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/15 resize-none transition-all"
            style={{ fontFamily: "'DM Sans', sans-serif" }}
          />
          <p className="text-[10px] text-stone-300 mt-2 tracking-wide">This message will be recorded and associated with the user's account.</p>
        </div>
        <div className="px-6 pb-6 flex items-center gap-3">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 border border-stone-200 text-stone-600 text-xs font-semibold tracking-wide uppercase rounded-xl hover:bg-stone-50 transition-colors">
            Cancel
          </button>
          <button
            onClick={() => onConfirm(message)}
            disabled={!message.trim() || loading}
            className="flex-1 px-4 py-2.5 text-white text-xs font-bold uppercase tracking-wide rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ background: (!message.trim() || loading) ? '#d97706' : 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' }}
          >
            {loading ? 'Sending…' : 'Issue Warning'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default WarnModal;