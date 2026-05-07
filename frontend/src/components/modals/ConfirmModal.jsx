import React, { useEffect } from 'react';

const ConfirmModal = ({ open, onClose, onConfirm, title, description, confirmLabel = 'Confirm', variant = 'danger' }) => {
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
      style={{ backgroundColor: 'rgba(26,23,20,0.45)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div
        className="bg-white border border-stone-200 rounded-2xl w-full max-w-sm p-6 sm:p-8 shadow-2xl"
        style={{ animation: 'modalIn 0.18s ease both' }}
        onClick={e => e.stopPropagation()}
      >
        <p className="text-[10px] uppercase tracking-[0.18em] font-bold mb-5" style={{ color: variant === 'danger' ? '#dc2626' : '#15803d' }}>
          {variant === 'danger' ? 'Confirm action' : 'Confirm restore'}
        </p>
        <h3 className="text-xl text-stone-900 mb-2 leading-snug" style={{ fontFamily: "'Fraunces', Georgia, serif", letterSpacing: '-0.01em' }}>
          {title}
        </h3>
        {description && <p className="text-sm text-stone-400 leading-relaxed mt-1">{description}</p>}
        <div className="flex items-center gap-3 mt-8">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 border border-stone-200 text-stone-600 text-xs font-semibold tracking-wide uppercase rounded-xl hover:bg-stone-50 transition-colors">
            Cancel
          </button>
          <button
            onClick={() => { onConfirm(); onClose(); }}
            className={`flex-1 px-4 py-2.5 text-white text-xs font-semibold tracking-wide uppercase rounded-xl transition-colors ${variant === 'danger' ? 'bg-red-600 hover:bg-red-500' : 'bg-stone-800 hover:bg-stone-700'}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;