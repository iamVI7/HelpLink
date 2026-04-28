import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useRequests } from '../context/RequestContext';
import { useSocket } from '../context/SocketContext';
import api from '../services/api';
import toast from 'react-hot-toast';
import AdminMiniMap from '../components/AdminMiniMap';

// ─────────────────────────────────────────────────────────────────────────────
// Shared primitives
// ─────────────────────────────────────────────────────────────────────────────
const UrgencyBadge = ({ level }) => {
  const map = {
    high:     'text-red-600 bg-red-50 border-red-200',
    medium:   'text-yellow-700 bg-yellow-50 border-yellow-200',
    low:      'text-green-700 bg-green-50 border-green-200',
    critical: 'text-red-700 bg-red-100 border-red-300',
  };
  return (
    <span className={`inline-flex items-center border px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest rounded-lg ${map[level] ?? map.low}`}>
      {level}
    </span>
  );
};

const StatusBadge = ({ status }) => {
  const map = {
    open:          'text-green-700 bg-green-50 border-green-200',
    'in-progress': 'text-blue-700 bg-blue-50 border-blue-200',
    completed:     'text-stone-500 bg-stone-50 border-stone-200',
  };
  const label = { open: 'Open', 'in-progress': 'In Progress', completed: 'Completed' };
  const key = status ?? 'open';
  return (
    <span className={`inline-flex items-center border px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest rounded-lg ${map[key] ?? map.open}`}>
      {label[key] ?? key}
    </span>
  );
};

const TypeBadge = ({ type, isSOS }) => {
  const resolvedType = type || (isSOS ? 'USER_SOS' : 'REQUEST');
  if (resolvedType === 'GUEST_SOS') return (
    <span className="inline-flex items-center gap-1 border border-red-300 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest rounded-lg bg-red-100 text-red-700 whitespace-nowrap">
      🚨 Guest SOS
    </span>
  );
  if (resolvedType === 'USER_SOS') return (
    <span className="inline-flex items-center gap-1 border border-red-200 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest rounded-lg bg-red-50 text-red-600 whitespace-nowrap">
      🚨 SOS
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1 border border-stone-200 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest rounded-lg bg-stone-50 text-stone-500 whitespace-nowrap">
      📝 Request
    </span>
  );
};

const formatDate = (str) => {
  if (!str) return '—';
  return new Date(str).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

// ─────────────────────────────────────────────────────────────────────────────
// Checkbox — pure Tailwind, no appearance:none hacks
// ─────────────────────────────────────────────────────────────────────────────
const Checkbox = ({ checked, indeterminate = false, onChange, title }) => (
  <button
    type="button"
    role="checkbox"
    aria-checked={indeterminate ? 'mixed' : checked}
    title={title}
    onClick={onChange}
    className={`
      w-4 h-4 rounded flex items-center justify-center shrink-0
      border-2 transition-all duration-100 cursor-pointer
      ${checked || indeterminate
        ? 'bg-red-600 border-red-600'
        : 'bg-white border-stone-300 hover:border-red-400'}
    `}
  >
    {indeterminate && !checked ? (
      <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 10 2" fill="none">
        <path d="M1 1h8" stroke="white" strokeWidth="2" strokeLinecap="round"/>
      </svg>
    ) : checked ? (
      <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 10 8" fill="none">
        <path d="M1 4L3.5 6.5 9 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ) : null}
  </button>
);

// ─────────────────────────────────────────────────────────────────────────────
// StatPill
// ─────────────────────────────────────────────────────────────────────────────
const StatPill = ({ value, label, color, bg }) => (
  <div
    className="stat-chip flex items-center gap-2 px-4 py-2 rounded-full border"
    style={{ background: bg, borderColor: `${color}22` }}
  >
    <span className="text-lg font-bold leading-none" style={{ color, fontFamily: "'Fraunces', Georgia, serif" }}>
      {value}
    </span>
    <span className="text-[10px] uppercase tracking-widest font-semibold text-stone-400">{label}</span>
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// SectionLabel
// ─────────────────────────────────────────────────────────────────────────────
const SectionLabel = ({ children, aside }) => (
  <div className="flex items-center justify-between mb-4">
    <h2
      className="text-base font-semibold text-stone-800 tracking-tight"
      style={{ fontFamily: "'Fraunces', Georgia, serif" }}
    >
      {children}
    </h2>
    {aside && <span className="text-[11px] text-stone-400 font-medium">{aside}</span>}
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// FilterTabs — scrollable on small screens
// ─────────────────────────────────────────────────────────────────────────────
const FilterTabs = ({ tabs, active, onChange }) => (
  <div className="overflow-x-auto pb-0.5 -mx-0.5 px-0.5">
    <div className="flex shrink-0 p-1 gap-1 rounded-full w-fit" style={{ background: '#ede9e4' }}>
      {tabs.map((tab) => (
        <button
          key={tab.key}
          onClick={() => onChange(tab.key)}
          className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest rounded-full transition-colors whitespace-nowrap ${
            active === tab.key
              ? 'bg-stone-900 text-white'
              : 'text-stone-400 hover:text-stone-600'
          }`}
        >
          {tab.label}
          <span className={`ml-1 ${active === tab.key ? 'text-stone-400' : 'text-stone-300'}`}>
            {tab.count}
          </span>
        </button>
      ))}
    </div>
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// Skeleton
// ─────────────────────────────────────────────────────────────────────────────
const Sk = ({ w, h, r = 8, style = {} }) => (
  <div className="sk-shimmer" style={{ width: w, height: h, borderRadius: r, flexShrink: 0, ...style }} />
);

const RowSkeleton = ({ last = false }) => (
  <div style={{ padding: '16px 20px', borderBottom: last ? 'none' : '1px solid #f5f3f0' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
      <Sk w={68} h={20} r={100} />
      <Sk w={54} h={13} r={6} />
    </div>
    <Sk w="60%" h={14} r={6} style={{ marginBottom: 6 }} />
    <Sk w="80%" h={11} r={5} />
  </div>
);

const AdminSkeleton = () => (
  <div className="flex flex-col lg:flex-row gap-6 items-start">
    {/* LEFT */}
    <div className="w-full lg:w-[52%] flex-shrink-0">
      <div className="hero-card mt-6 px-7 py-8">
        <Sk w={90} h={22} r={100} style={{ marginBottom: 20 }} />
        <Sk w="50%" h={46} r={10} style={{ marginBottom: 10 }} />
        <Sk w="65%" h={13} r={6} style={{ marginBottom: 24 }} />
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          <Sk w={88} h={38} r={100} />
          <Sk w={72} h={38} r={100} />
          <Sk w={88} h={38} r={100} />
          <Sk w={72} h={38} r={100} />
        </div>
      </div>
      <div className="mt-6">
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
          <Sk w={148} h={18} r={6} />
          <Sk w={56} h={13} r={6} />
        </div>
        <div className="content-card">
          <RowSkeleton />
          <RowSkeleton />
          <RowSkeleton last />
        </div>
      </div>
    </div>
    {/* RIGHT */}
    <div className="w-full lg:flex-1 min-w-0">
      <div className="mt-6">
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
          <Sk w={104} h={18} r={6} />
          <Sk w={130} h={13} r={6} />
        </div>
        <div className="content-card">
          <div style={{ padding: '12px 16px', borderBottom: '1px solid #f0ece8', background: '#faf9f7', display: 'flex', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', gap: 4, padding: 4, borderRadius: 100, background: '#ede9e4' }}>
              <Sk w={92} h={30} r={100} />
              <Sk w={72} h={30} r={100} />
              <Sk w={72} h={30} r={100} />
            </div>
          </div>
          <RowSkeleton />
          <RowSkeleton />
          <RowSkeleton />
          <RowSkeleton last />
        </div>
      </div>
    </div>
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// ConfirmModal
// ─────────────────────────────────────────────────────────────────────────────
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

// ─────────────────────────────────────────────────────────────────────────────
// WarnModal
// ─────────────────────────────────────────────────────────────────────────────
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

// ─────────────────────────────────────────────────────────────────────────────
// EvidenceModal
// ─────────────────────────────────────────────────────────────────────────────
const EvidenceModal = ({ open, onClose, request }) => {
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
  const BASE_URL = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL)
    ? import.meta.env.VITE_API_URL.replace('/api', '') : 'http://localhost:5000';

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
                  <img src={`${BASE_URL}${images[activeIdx].url}`} alt={`Evidence ${activeIdx + 1}`} className="w-full h-full object-contain" />
                  <a href={`${BASE_URL}${images[activeIdx].url}`} target="_blank" rel="noopener noreferrer"
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
                        <img src={`${BASE_URL}${img.url}`} alt={`Thumb ${idx + 1}`} className="w-full h-full object-cover" />
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

// ─────────────────────────────────────────────────────────────────────────────
// IconBtn + ActionButtons
// ─────────────────────────────────────────────────────────────────────────────
const IconBtn = ({ onClick, title, style, hoverStyle, children, badge }) => {
  const [hovered, setHovered] = useState(false);
  return (
    <div className="relative group">
      <button
        onClick={onClick} title={title}
        className="relative flex items-center justify-center w-8 h-8 rounded-lg transition-all duration-150"
        style={hovered ? { ...style, ...hoverStyle } : style}
        onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
      >
        {children}
        {badge > 0 && (
          <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[14px] h-3.5 px-0.5 rounded-full text-white leading-none"
            style={{ fontSize: '8px', fontWeight: 900, background: '#d97706' }}>
            {badge}
          </span>
        )}
      </button>
      <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-100 whitespace-nowrap"
        style={{ background: '#1a1714', color: '#e7e5e4', fontSize: '10px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', zIndex: 20 }}>
        {title}
        <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent" style={{ borderTopColor: '#1a1714' }} />
      </div>
    </div>
  );
};

const ActionButtons = ({ u, warnCount, onWarn, onDeactivate, onRestore, onPermDelete }) => {
  if (u.role === 'admin') return (
    <span className="inline-flex items-center px-2 py-1 rounded-md bg-stone-50 border border-stone-200 text-[9px] font-bold uppercase tracking-widest text-stone-300">Protected</span>
  );
  return (
    <div className="inline-flex items-center gap-1">
      <IconBtn onClick={() => onWarn(u)} title="Warn" badge={warnCount}
        style={{ color: '#b45309', background: 'rgba(245,158,11,0.07)', border: '1px solid rgba(245,158,11,0.2)' }}
        hoverStyle={{ background: 'rgba(245,158,11,0.14)', borderColor: 'rgba(245,158,11,0.38)' }}>
        <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="currentColor">
          <path d="M8 1.5a.5.5 0 0 1 .447.276l6 11A.5.5 0 0 1 14 13.5H2a.5.5 0 0 1-.447-.724l6-11A.5.5 0 0 1 8 1.5zM8 5a.5.5 0 0 0-.5.5v3a.5.5 0 0 0 1 0v-3A.5.5 0 0 0 8 5zm0 6.5a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5z"/>
        </svg>
      </IconBtn>
      {u.isDeleted ? (
        <IconBtn onClick={() => onRestore(u)} title="Restore"
          style={{ color: '#57534e', background: 'rgba(120,113,108,0.06)', border: '1px solid rgba(120,113,108,0.18)' }}
          hoverStyle={{ background: 'rgba(120,113,108,0.13)', borderColor: 'rgba(120,113,108,0.32)' }}>
          <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="currentColor">
            <path d="M8 3a5 5 0 1 1-4.546 2.914.5.5 0 0 0-.908-.417A6 6 0 1 0 8 2v1z"/>
            <path d="M8 4.466V.534a.25.25 0 0 0-.41-.192L5.23 2.308a.25.25 0 0 0 0 .384l2.36 1.966A.25.25 0 0 0 8 4.466z"/>
          </svg>
        </IconBtn>
      ) : (
        <IconBtn onClick={() => onDeactivate(u)} title="Deactivate"
          style={{ color: '#dc2626', background: 'rgba(220,38,38,0.05)', border: '1px solid rgba(220,38,38,0.16)' }}
          hoverStyle={{ background: 'rgba(220,38,38,0.1)', borderColor: 'rgba(220,38,38,0.32)' }}>
          <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="currentColor">
            <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/>
            <path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z"/>
          </svg>
        </IconBtn>
      )}
      <IconBtn onClick={() => onPermDelete(u)} title="Delete Forever"
        style={{ color: '#fff', background: 'linear-gradient(135deg,#dc2626,#b91c1c)', border: '1px solid rgba(185,28,28,0.45)', boxShadow: '0 1px 4px rgba(220,38,38,0.2)' }}
        hoverStyle={{ background: 'linear-gradient(135deg,#ef4444,#dc2626)', boxShadow: '0 3px 10px rgba(220,38,38,0.35)' }}>
        <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="currentColor">
          <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z"/>
          <path fillRule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"/>
        </svg>
      </IconBtn>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Mobile cards
// ─────────────────────────────────────────────────────────────────────────────
const RequestMobileCard = ({ req, onDelete, onViewEvidence, isLast, selected, onToggleSelect }) => (
  <div className={`px-4 py-4 req-item ${!isLast ? 'border-b border-stone-100' : ''} ${selected ? 'bg-red-50/60' : req.isSOS ? 'bg-red-50/70' : req.urgency === 'high' ? 'bg-red-50/50' : ''}`}>
    <div className="flex items-start gap-3">
      {/* Checkbox */}
      <div className="pt-0.5 shrink-0">
        <button
          onClick={() => onToggleSelect(req._id)}
          className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all ${selected ? 'bg-red-600 border-red-600' : 'border-stone-300 bg-white hover:border-red-400'}`}
        >
          {selected && (
            <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 12 12" fill="currentColor">
              <path d="M10 3L5 8.5 2 5.5" stroke="white" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          )}
        </button>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="mb-1.5"><TypeBadge type={req.type} isSOS={req.isSOS} /></div>
            <p className="font-semibold text-stone-900 text-sm leading-snug truncate">{req.title ?? req.type ?? 'Untitled'}</p>
            {req.description && (
              <p className="text-xs text-stone-400 mt-0.5 line-clamp-2">{req.description}</p>
            )}
          </div>
          <button onClick={() => onDelete(req._id)} className="shrink-0 text-[10px] font-bold text-red-600 hover:text-red-800 uppercase tracking-widest transition-colors pt-0.5">
            Delete
          </button>
        </div>
        <div className="flex items-center gap-2 mt-3 flex-wrap">
          <UrgencyBadge level={req.urgency} />
          <StatusBadge status={req.status} />
          {req.media?.images?.some(img => img.url) && (
            <button onClick={() => onViewEvidence(req)}
              className="inline-flex items-center gap-1 text-[10px] font-bold text-stone-500 hover:text-stone-800 uppercase tracking-widest transition-colors border border-stone-200 rounded-lg px-2 py-0.5 bg-stone-50 hover:bg-stone-100">
              📷 Evidence
            </button>
          )}
          <span className="text-[10px] text-stone-400 font-medium ml-auto">{formatDate(req.createdAt)}</span>
        </div>
      </div>
    </div>
  </div>
);

const UserMobileCard = ({ u, warnCount, onDeactivate, onRestore, onWarn, onPermDelete, isLast }) => (
  <div className={`px-4 py-4 req-item ${!isLast ? 'border-b border-stone-100' : ''} ${u.isDeleted ? 'opacity-60' : ''}`}>
    <div className="flex items-center gap-3">
      <div className="w-9 h-9 rounded-full bg-stone-100 border border-stone-200 flex items-center justify-center text-xs font-bold text-stone-600 shrink-0 select-none">
        {u.name?.[0]?.toUpperCase() ?? '?'}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="font-semibold text-stone-900 text-sm truncate">{u.name}</div>
          {u.isVerified && <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full bg-green-50 text-green-600 border border-green-200">✔ Verified</span>}
        </div>
        <div className="text-xs text-stone-400 truncate">{u.email}</div>
      </div>
    </div>
    <div className="flex items-center gap-2 mt-2.5 pl-12">
      {u.role === 'admin' ? (
        <span className="inline-flex items-center border border-stone-300 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-stone-600 bg-stone-50 rounded-lg">Admin</span>
      ) : (
        <span className="text-[10px] text-stone-400 uppercase tracking-widest font-bold">User</span>
      )}
      <span className={`inline-flex items-center border px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest rounded-lg ${u.isDeleted ? 'border-red-200 text-red-600 bg-red-50' : 'border-green-200 text-green-700 bg-green-50'}`}>
        {u.isDeleted ? 'Deactivated' : 'Active'}
      </span>
    </div>
    <div className="mt-3 pl-12">
      <ActionButtons u={u} warnCount={warnCount} onWarn={onWarn} onDeactivate={onDeactivate} onRestore={onRestore} onPermDelete={onPermDelete} />
    </div>
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// BulkDeleteBar — floating action bar shown when items are selected
// ─────────────────────────────────────────────────────────────────────────────
const BulkDeleteBar = ({ count, onDelete, onClear }) => {
  if (count === 0) return null;
  return (
    <div
      className="bulk-bar flex items-center justify-between gap-3 px-4 py-3 rounded-2xl border border-red-200 bg-white shadow-lg"
      style={{ animation: 'bulkBarIn 0.2s ease both' }}
    >
      <div className="flex items-center gap-2.5">
        <div className="w-5 h-5 rounded-full bg-red-600 flex items-center justify-center shrink-0">
          <span className="text-white font-black leading-none" style={{ fontSize: 9 }}>{count}</span>
        </div>
        <span className="text-xs font-bold text-stone-700 uppercase tracking-widest">
          {count} {count === 1 ? 'request' : 'requests'} selected
        </span>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={onClear}
          className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-stone-500 hover:text-stone-700 transition-colors rounded-lg hover:bg-stone-100"
        >
          Clear
        </button>
        <button
          onClick={onDelete}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-widest text-white transition-all"
          style={{ background: 'linear-gradient(135deg,#dc2626,#b91c1c)', boxShadow: '0 2px 8px rgba(220,38,38,0.3)' }}
        >
          <svg className="w-3 h-3" viewBox="0 0 16 16" fill="currentColor">
            <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z"/>
            <path fillRule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"/>
          </svg>
          Delete {count}
        </button>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// AdminDashboard
// ─────────────────────────────────────────────────────────────────────────────
const AdminDashboard = () => {
  const didFetchRef = useRef(false);
  const { user } = useAuth();
  const { allRequests, setAdminRequests } = useRequests();
  useSocket();

  const [users,         setUsers]         = useState([]);
  const [userSearch,    setUserSearch]    = useState('');
  const [userFilter,    setUserFilter]    = useState('all');
  const [requestFilter, setRequestFilter] = useState('all');
  const [warnCounts,    setWarnCounts]    = useState({});
  const [loading,       setLoading]       = useState(true);

  // ── Multi-select state ──
  const [selectedRequestIds, setSelectedRequestIds] = useState(new Set());

  const [modal,       setModal]       = useState({ open: false, title: '', description: '', confirmLabel: 'Confirm', variant: 'danger', onConfirm: () => {} });
  const [warnModal,   setWarnModal]   = useState({ open: false, userId: null });
  const [warnLoading, setWarnLoading] = useState(false);
  const [evidenceModal, setEvidenceModal] = useState({ open: false, request: null });

  const closeModal = useCallback(() => setModal(m => ({ ...m, open: false })), []);
  const openModal  = useCallback((cfg) => setModal({ open: true, ...cfg }), []);

  const activeRequests = allRequests || [];

  const [stats, setStats] = useState({ total: 0, sos: 0, high: 0, medium: 0 });

  const fetchAllRequests = useCallback(async () => {
    try {
      const res = await api.get('/requests/admin/all');
      setAdminRequests(res.data.requests);
    } catch (err) { console.error(err); }
  }, [setAdminRequests]);

  const fetchUsers = useCallback(async () => {
    try {
      const res = await api.get('/auth/admin/users');
      setUsers(res.data.users);
    } catch { toast.error('Failed to load users'); }
  }, []);

  const fetchWarnCounts = useCallback(async (userList) => {
    const nonAdmins = userList.filter(u => u.role !== 'admin');
    if (nonAdmins.length === 0) return;
    const results = await Promise.allSettled(
      nonAdmins.map(u =>
        api.get(`/auth/admin/users/${u._id}/warnings/count`)
           .then(r => ({ id: u._id, count: r.data.count ?? 0 }))
           .catch(() => ({ id: u._id, count: 0 }))
      )
    );
    const counts = {};
    results.forEach(r => { if (r.status === 'fulfilled') counts[r.value.id] = r.value.count; });
    setWarnCounts(counts);
  }, []);

  useEffect(() => {
    if (didFetchRef.current) return;
    didFetchRef.current = true;
    Promise.all([fetchAllRequests(), fetchUsers()]).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (users.length === 0) return;
    fetchWarnCounts(users);
  }, [users, fetchWarnCounts]);

  useEffect(() => {
    setStats({
      total:  activeRequests.length,
      sos:    activeRequests.filter(r => r.isSOS).length,
      high:   activeRequests.filter(r => r.urgency === 'high' && !r.isSOS).length,
      medium: activeRequests.filter(r => r.urgency === 'medium').length,
    });
  }, [activeRequests]);

  // Clear selection when filter changes
  useEffect(() => { setSelectedRequestIds(new Set()); }, [requestFilter]);

  const urgentRequests = activeRequests.filter(r => r.urgency === 'high' || r.isSOS);

  const filteredRequests = activeRequests.filter(r => {
    if (requestFilter === 'all') return true;
    return (r.status ?? 'open') === requestFilter;
  });

  const requestFilterCounts = {
    all:           activeRequests.length,
    open:          activeRequests.filter(r => (r.status ?? 'open') === 'open').length,
    'in-progress': activeRequests.filter(r => r.status === 'in-progress').length,
    completed:     activeRequests.filter(r => r.status === 'completed').length,
  };

  // ── Single delete (existing) ──
  const confirmDeleteRequest = useCallback((id) => openModal({
    title: 'Delete this request?',
    description: 'This cannot be undone. The request will be permanently removed.',
    confirmLabel: 'Delete', variant: 'danger',
    onConfirm: async () => {
      try {
        await api.patch(`/requests/admin/${id}/delete`);
        setAdminRequests(allRequests.filter(r => r._id !== id));
        setSelectedRequestIds(prev => { const n = new Set(prev); n.delete(id); return n; });
        toast.success('Request deleted');
      } catch { toast.error('Delete failed'); }
    },
  }), [openModal, allRequests, setAdminRequests]);

  // ── Multi-select helpers ──
  const toggleSelectRequest = useCallback((id) => {
    setSelectedRequestIds(prev => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  }, []);

  const allFilteredSelected = filteredRequests.length > 0 && filteredRequests.every(r => selectedRequestIds.has(r._id));
  const someFilteredSelected = filteredRequests.some(r => selectedRequestIds.has(r._id));

  const toggleSelectAll = useCallback(() => {
    if (allFilteredSelected) {
      setSelectedRequestIds(prev => {
        const n = new Set(prev);
        filteredRequests.forEach(r => n.delete(r._id));
        return n;
      });
    } else {
      setSelectedRequestIds(prev => {
        const n = new Set(prev);
        filteredRequests.forEach(r => n.add(r._id));
        return n;
      });
    }
  }, [allFilteredSelected, filteredRequests]);

  const selectedCount = [...selectedRequestIds].filter(id => filteredRequests.some(r => r._id === id)).length;

  // ── Bulk delete ──
  const confirmBulkDelete = useCallback(() => {
    const idsToDelete = [...selectedRequestIds].filter(id => filteredRequests.some(r => r._id === id));
    if (idsToDelete.length === 0) return;
    openModal({
      title: `Delete ${idsToDelete.length} ${idsToDelete.length === 1 ? 'request' : 'requests'}?`,
      description: 'This cannot be undone. All selected requests will be permanently removed.',
      confirmLabel: `Delete ${idsToDelete.length}`, variant: 'danger',
      onConfirm: async () => {
        try {
          await Promise.allSettled(idsToDelete.map(id => api.patch(`/requests/admin/${id}/delete`)));
          setAdminRequests(allRequests.filter(r => !idsToDelete.includes(r._id)));
          setSelectedRequestIds(prev => {
            const n = new Set(prev);
            idsToDelete.forEach(id => n.delete(id));
            return n;
          });
          toast.success(`${idsToDelete.length} ${idsToDelete.length === 1 ? 'request' : 'requests'} deleted`);
        } catch { toast.error('Some deletions failed'); }
      },
    });
  }, [selectedRequestIds, filteredRequests, openModal, allRequests, setAdminRequests]);

  const confirmDeleteUser = useCallback((u) => openModal({
    title: `Deactivate ${u.name}?`,
    description: 'The user will lose access immediately. You can restore them at any time.',
    confirmLabel: 'Deactivate', variant: 'danger',
    onConfirm: async () => {
      try {
        await api.patch(`/auth/admin/users/${u._id}/delete`);
        setUsers(prev => prev.map(x => x._id === u._id ? { ...x, isDeleted: true } : x));
        toast.success('User deactivated');
      } catch { toast.error('Failed to deactivate'); }
    },
  }), [openModal]);

  const confirmRestoreUser = useCallback((u) => openModal({
    title: `Restore ${u.name}?`,
    description: 'The user will regain full access to their account right away.',
    confirmLabel: 'Restore', variant: 'success',
    onConfirm: async () => {
      try {
        await api.patch(`/auth/admin/users/${u._id}/restore`);
        setUsers(prev => prev.map(x => x._id === u._id ? { ...x, isDeleted: false } : x));
        toast.success('User restored');
      } catch { toast.error('Restore failed'); }
    },
  }), [openModal]);

  const handleOpenWarnModal = useCallback((u) => setWarnModal({ open: true, userId: u._id }), []);

  const handleIssueWarning = useCallback(async (message) => {
    if (!message.trim()) return;
    setWarnLoading(true);
    try {
      await api.post(`/auth/admin/users/${warnModal.userId}/warn`, { message });
      setWarnCounts(prev => ({ ...prev, [warnModal.userId]: (prev[warnModal.userId] || 0) + 1 }));
      setWarnModal({ open: false, userId: null });
      toast.success('Warning issued successfully');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to issue warning');
    } finally { setWarnLoading(false); }
  }, [warnModal.userId]);

  const confirmPermDeleteUser = useCallback((u) => openModal({
    title: `Permanently delete ${u.name}?`,
    description: 'This will completely remove the user and all their warnings. This action cannot be undone.',
    confirmLabel: 'Delete Forever', variant: 'danger',
    onConfirm: async () => {
      try {
        await api.delete(`/auth/admin/users/${u._id}/permanent`);
        setUsers(prev => prev.filter(x => x._id !== u._id));
        setWarnCounts(prev => { const n = { ...prev }; delete n[u._id]; return n; });
        toast.success('User permanently deleted');
      } catch (err) { toast.error(err.response?.data?.message || 'Failed to delete user'); }
    },
  }), [openModal]);

  const filteredUsers = users.filter(u => {
    const matchSearch = u.name?.toLowerCase().includes(userSearch.toLowerCase()) || u.email?.toLowerCase().includes(userSearch.toLowerCase());
    const matchFilter = userFilter === 'all' || (userFilter === 'active' && !u.isDeleted) || (userFilter === 'deactivated' && u.isDeleted);
    return matchSearch && matchFilter;
  });

  const filterCounts = {
    all:         users.length,
    active:      users.filter(u => !u.isDeleted).length,
    deactivated: users.filter(u => u.isDeleted).length,
  };

  const firstName = user?.name?.split(' ')[0] ?? 'Admin';

  return (
    <div
      className="min-h-screen"
      style={{ fontFamily: "'DM Sans', 'Helvetica Neue', sans-serif", background: '#f7f5f2', color: '#1c1917', paddingTop: '80px' }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,600;1,9..144,400;1,9..144,600&family=DM+Sans:wght@300;400;500;600&display=swap');

        @keyframes shimmer { 0% { background-position: -600px 0; } 100% { background-position: 600px 0; } }
        @keyframes pulse-border { 0%,100% { border-color: rgba(220,38,38,0.25); } 50% { border-color: rgba(220,38,38,0.55); } }
        @keyframes modalIn { from { opacity: 0; transform: translateY(10px) scale(0.97); } to { opacity: 1; transform: translateY(0) scale(1); } }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes bulkBarIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }

        .sk-shimmer {
          background: linear-gradient(90deg, #e8e4de 25%, #f0ece6 50%, #e8e4de 75%);
          background-size: 600px 100%;
          animation: shimmer 1.6s ease-in-out infinite;
        }
        .hero-card {
          background: #fff;
          border-radius: 24px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.05), 0 6px 24px rgba(0,0,0,0.05);
          border: 1px solid rgba(0,0,0,0.05);
        }
        .content-card {
          background: #fff;
          border-radius: 20px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.05), 0 4px 16px rgba(0,0,0,0.04);
          border: 1px solid rgba(0,0,0,0.05);
          overflow: hidden;
        }
        .stat-chip { transition: transform 0.15s, box-shadow 0.15s; }
        .stat-chip:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.08); }
        .req-item { transition: background 0.12s; }
        .req-item:hover { background: #faf9f7; }
        .dashboard-badge {
          animation: pulse-border 2.4s ease-in-out infinite;
          display: inline-flex; align-items: center;
          padding: 4px 13px; border-radius: 100px;
          border: 1px solid rgba(220,38,38,0.3);
          color: #dc2626;
          font-size: 10px; font-weight: 700; letter-spacing: 0.16em; text-transform: uppercase;
          background: rgba(254,242,242,0.7);
        }
        .anim-0 { animation: fadeUp 0.4s 0.04s both ease-out; }
        .anim-1 { animation: fadeUp 0.4s 0.10s both ease-out; }
        .anim-2 { animation: fadeUp 0.4s 0.16s both ease-out; }
        .anim-3 { animation: fadeUp 0.4s 0.22s both ease-out; }
        .sos-row { background: rgba(254,242,242,0.7); }
        .sos-row:hover { background: rgba(254,226,226,0.7) !important; }
        .selected-row { background: rgba(220,38,38,0.04) !important; }
        .selected-row:hover { background: rgba(220,38,38,0.07) !important; }

        /* ── Requests table column widths ── */
        .req-table { table-layout: auto; width: 100%; }
        .req-table th, .req-table td { overflow: hidden; }
        .col-check    { width: 36px; }
        .col-type     { width: 1%; white-space: nowrap; }
        .col-request  { width: 99%; min-width: 120px; }
        .col-urgency  { width: 1%; white-space: nowrap; }
        .col-status   { width: 1%; white-space: nowrap; }
        .col-evidence { width: 1%; white-space: nowrap; }
        .col-action   { width: 1%; white-space: nowrap; }

        /* ── Users table column widths ── */
        .users-table { table-layout: fixed; width: 100%; }
        .users-table th, .users-table td { overflow: hidden; }
        .ucol-user    { width: auto; }
        .ucol-status  { width: 110px; }
        .ucol-actions { width: 130px; }

        /* Truncate helpers */
        .cell-truncate { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

        /* Line clamp for description */
        .line-clamp-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        /* Horizontal scroll for filter tabs on tiny screens */
        .filter-scroll { overflow-x: auto; }
        .filter-scroll::-webkit-scrollbar { display: none; }
        .filter-scroll { -ms-overflow-style: none; scrollbar-width: none; }

        /* Bulk bar */
        .bulk-bar { transition: box-shadow 0.15s; }
        .bulk-bar:hover { box-shadow: 0 6px 24px rgba(220,38,38,0.12); }
      `}</style>

      {/* Dot-grid background */}
      <div aria-hidden="true" style={{
        position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none',
        backgroundImage: 'radial-gradient(circle, rgba(0,0,0,0.055) 1px, transparent 1px)',
        backgroundSize: '26px 26px', opacity: 0.55,
      }} />

      {/* Modals */}
      <ConfirmModal open={modal.open} onClose={closeModal} onConfirm={modal.onConfirm}
        title={modal.title} description={modal.description} confirmLabel={modal.confirmLabel} variant={modal.variant} />
      <WarnModal open={warnModal.open} onClose={() => setWarnModal({ open: false, userId: null })}
        onConfirm={handleIssueWarning} loading={warnLoading} />
      <EvidenceModal open={evidenceModal.open} onClose={() => setEvidenceModal({ open: false, request: null })} request={evidenceModal.request} />

      <div style={{ position: 'relative', zIndex: 1 }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-10 pb-16">

          {loading ? (
            <AdminSkeleton />
          ) : (
            <div className="flex flex-col lg:flex-row gap-6 lg:items-stretch">

              {/* ══ LEFT COLUMN ══ */}
              <div className="w-full lg:w-[52%] flex-shrink-0 min-w-0 flex flex-col">

                {/* ── Hero Card ── */}
                <div className="hero-card mt-6 px-6 py-7 anim-0">
                  <div className="mb-4">
                    <span className="dashboard-badge">Admin Panel</span>
                  </div>
                  <h1 style={{
                    fontFamily: "'Fraunces', Georgia, serif",
                    fontSize: 'clamp(1.75rem, 4vw, 2.6rem)',
                    fontWeight: 600, lineHeight: 1.1, letterSpacing: '-0.015em', color: '#1c1917',
                  }}>
                    Hello,{' '}
                    <span style={{ color: '#dc2626', fontStyle: 'italic' }}>{firstName}.</span>
                  </h1>
                  <p className="text-sm text-stone-400 mt-2 mb-5 leading-relaxed" style={{ maxWidth: 300 }}>
                    Monitor requests, manage users, and keep the platform healthy.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <StatPill value={stats.total}  label="Total"  color="#1c1917" bg="#f7f5f2" />
                    <StatPill value={stats.sos}    label="SOS"    color="#dc2626" bg="#fef2f2" />
                    <StatPill value={stats.high}   label="High"   color="#d97706" bg="#fffbeb" />
                    <StatPill value={stats.medium} label="Medium" color="#16a34a" bg="#f0fdf4" />
                  </div>
                </div>

                {/* ── Live banner ── */}
                <div className="mt-4 anim-1 flex items-center justify-between gap-3 px-4 py-3 rounded-2xl border border-red-200 bg-red-50">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="w-2 h-2 bg-red-600 rounded-full animate-pulse shrink-0" />
                    <span className="text-xs font-bold uppercase tracking-widest text-red-600 truncate">Live Monitoring Active</span>
                  </div>
                  <span className="text-xs text-red-500 font-semibold shrink-0">
                    {urgentRequests.length} urgent {urgentRequests.length === 1 ? 'case' : 'cases'}
                  </span>
                </div>

                {/* ── High Priority / SOS ── */}
                {urgentRequests.length > 0 && (
                  <div className="mt-6 anim-1">
                    <SectionLabel aside={`${urgentRequests.length} open`}>High Priority / SOS</SectionLabel>
                    <div className="space-y-3">
                      {urgentRequests.slice(0, 5).map((req) => (
                        <div key={req._id} className="content-card px-4 py-4 flex items-start justify-between gap-4"
                          style={{ borderColor: req.isSOS ? 'rgba(220,38,38,0.35)' : 'rgba(220,38,38,0.18)', background: req.isSOS ? 'rgba(254,226,226,0.45)' : 'rgba(254,242,242,0.9)' }}>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <TypeBadge type={req.type} isSOS={req.isSOS} />
                              {req.type === 'GUEST_SOS' && req.guestId && (
                                <span className="text-[10px] text-stone-400 font-mono truncate">{req.guestId}</span>
                              )}
                            </div>
                            <p className="text-sm font-semibold text-stone-900 truncate">{req.title}</p>
                            {req.description && <p className="text-xs text-stone-500 mt-0.5 truncate">{req.description}</p>}
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {req.media?.images?.some(img => img.url) && (
                              <button onClick={() => setEvidenceModal({ open: true, request: req })}
                                className="text-[10px] font-bold text-stone-500 hover:text-stone-800 uppercase tracking-widest transition-colors border border-stone-200 rounded-lg px-2 py-1 bg-white hover:bg-stone-50">
                                📷
                              </button>
                            )}
                            <button onClick={() => confirmDeleteRequest(req._id)}
                              className="text-[10px] font-bold text-red-600 hover:text-red-800 uppercase tracking-widest transition-colors">
                              Remove
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* ── Live Map ── */}
                <div className="mt-6 anim-2 flex flex-col flex-1">
                  <SectionLabel>Live Map</SectionLabel>
                  <div className="content-card overflow-hidden rounded-2xl flex-1" style={{ minHeight: 200 }}>
                    <AdminMiniMap />
                  </div>
                </div>

              </div>{/* end LEFT COLUMN */}

              {/* ══ RIGHT COLUMN ══ */}
              <div className="w-full lg:flex-1 min-w-0 anim-3 flex flex-col">
                <div className="flex flex-col flex-1">

                  {/* ── All Requests ── */}
                  <div className="mt-6">
                    {/* Header row */}
                    <div className="flex items-baseline gap-2 mb-3">
                      <h2 className="text-base font-semibold text-stone-800 tracking-tight shrink-0" style={{ fontFamily: "'Fraunces', Georgia, serif" }}>
                        All Requests
                      </h2>
                      <span className="text-[11px] text-stone-400 font-medium">{filteredRequests.length} of {activeRequests.length}</span>
                    </div>

                    {/* Filter tabs */}
                    <div className="filter-scroll mb-3">
                      <FilterTabs
                        active={requestFilter}
                        onChange={setRequestFilter}
                        tabs={[
                          { key: 'all',         label: 'All',    count: requestFilterCounts.all },
                          { key: 'open',        label: 'Open',   count: requestFilterCounts.open },
                          { key: 'in-progress', label: 'Active', count: requestFilterCounts['in-progress'] },
                          { key: 'completed',   label: 'Done',   count: requestFilterCounts.completed },
                        ]}
                      />
                    </div>

                    {/* ── Bulk Delete Bar ── */}
                    <div className="mb-3">
                      <BulkDeleteBar
                        count={selectedCount}
                        onDelete={confirmBulkDelete}
                        onClear={() => setSelectedRequestIds(new Set())}
                      />
                    </div>

                    <div className="content-card">
                      {filteredRequests.length === 0 ? (
                        <div className="py-16 text-center">
                          <p className="text-sm text-stone-400 italic">{requestFilter === 'all' ? 'No requests found' : `No ${requestFilter} requests`}</p>
                        </div>
                      ) : (
                        <>
                          {/* Mobile */}
                          <div className="sm:hidden">
                            {/* Mobile select-all bar */}
                            <div className="flex items-center gap-2.5 px-4 py-3 border-b border-stone-100 bg-stone-50/80">
                              <Checkbox
                                checked={allFilteredSelected}
                                indeterminate={someFilteredSelected && !allFilteredSelected}
                                onChange={toggleSelectAll}
                                title={allFilteredSelected ? 'Deselect all' : 'Select all'}
                              />
                              <span className="text-[10px] font-bold uppercase tracking-widest text-stone-400">
                                {allFilteredSelected ? 'Deselect all' : 'Select all'}
                              </span>
                            </div>
                            {filteredRequests.map((req, idx) => (
                              <RequestMobileCard key={req._id} req={req} onDelete={confirmDeleteRequest}
                                onViewEvidence={(r) => setEvidenceModal({ open: true, request: r })}
                                isLast={idx === filteredRequests.length - 1}
                                selected={selectedRequestIds.has(req._id)}
                                onToggleSelect={toggleSelectRequest}
                              />
                            ))}
                          </div>

                          {/* Desktop */}
                          <div className="hidden sm:block overflow-x-auto">
                            <table className="req-table text-sm border-collapse">
                              <thead>
                                <tr className="border-b border-stone-100 bg-stone-50/80">
                                  {/* Select-all checkbox header */}
                                  <th className="col-check px-4 py-3.5">
                                    <div className="flex items-center justify-center">
                                      <Checkbox
                                        checked={allFilteredSelected}
                                        indeterminate={someFilteredSelected && !allFilteredSelected}
                                        onChange={toggleSelectAll}
                                        title={allFilteredSelected ? 'Deselect all' : 'Select all'}
                                      />
                                    </div>
                                  </th>
                                  <th className="col-type px-4 py-3.5 text-left text-[10px] font-bold uppercase tracking-[0.14em] text-stone-400">Type</th>
                                  <th className="col-request px-4 py-3.5 text-left text-[10px] font-bold uppercase tracking-[0.14em] text-stone-400">Request</th>
                                  <th className="col-urgency px-4 py-3.5 text-left text-[10px] font-bold uppercase tracking-[0.14em] text-stone-400">Urgency</th>
                                  <th className="col-status px-4 py-3.5 text-left text-[10px] font-bold uppercase tracking-[0.14em] text-stone-400">Status</th>
                                  <th className="col-evidence px-4 py-3.5 text-left text-[10px] font-bold uppercase tracking-[0.14em] text-stone-400">Evidence</th>
                                  <th className="col-action px-4 py-3.5" />
                                </tr>
                              </thead>
                              <tbody>
                                {filteredRequests.map((req, idx) => {
                                  const isSelected = selectedRequestIds.has(req._id);
                                  return (
                                    <tr key={req._id}
                                      className={`req-item ${isSelected ? 'selected-row' : req.isSOS ? 'sos-row' : req.urgency === 'high' ? 'bg-red-50/40' : ''} ${idx < filteredRequests.length - 1 ? 'border-b border-stone-100' : ''}`}>
                                      {/* Checkbox cell */}
                                      <td className="col-check px-4 py-3.5">
                                        <div className="flex items-center justify-center">
                                          <Checkbox
                                            checked={isSelected}
                                            onChange={() => toggleSelectRequest(req._id)}
                                          />
                                        </div>
                                      </td>
                                      <td className="col-type px-4 py-3.5">
                                        <TypeBadge type={req.type} isSOS={req.isSOS} />
                                      </td>
                                      <td className="col-request px-4 py-3.5">
                                        <div className="font-semibold text-stone-900 text-sm leading-snug">{req.title ?? 'Untitled'}</div>
                                        {req.description && <div className="text-xs text-stone-400 mt-0.5 line-clamp-2">{req.description}</div>}
                                        {req.createdBy?.name && <div className="text-[10px] text-stone-400 mt-0.5">by {req.createdBy.name}</div>}
                                      </td>
                                      <td className="col-urgency px-4 py-3.5">
                                        <UrgencyBadge level={req.urgency} />
                                      </td>
                                      <td className="col-status px-4 py-3.5">
                                        <StatusBadge status={req.status} />
                                      </td>
                                      <td className="col-evidence px-4 py-3.5">
                                        {req.media?.images?.some(img => img.url) ? (
                                          <button onClick={() => setEvidenceModal({ open: true, request: req })}
                                            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg border border-stone-200 bg-stone-50 text-[10px] font-bold uppercase tracking-widest text-stone-600 hover:bg-stone-100 hover:border-stone-300 transition-colors">
                                            📷 View
                                          </button>
                                        ) : (
                                          <span className="text-[10px] text-stone-300 font-medium">—</span>
                                        )}
                                      </td>
                                      <td className="col-action px-4 py-3.5 text-right">
                                        <button onClick={() => confirmDeleteRequest(req._id)}
                                          className="text-[10px] font-bold text-red-600 hover:text-red-800 uppercase tracking-widest transition-colors">
                                          Delete
                                        </button>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* ── Users Management ── */}
                  <div className="mt-8 pb-6">
                    {/* Header row */}
                    <div className="flex items-baseline gap-2 mb-3">
                      <h2 className="text-base font-semibold text-stone-800 tracking-tight shrink-0" style={{ fontFamily: "'Fraunces', Georgia, serif" }}>
                        Users
                      </h2>
                      <span className="text-[11px] text-stone-400 font-medium">{filteredUsers.length} of {users.length}</span>
                    </div>

                    {/* Filter tabs */}
                    <div className="filter-scroll mb-4">
                      <FilterTabs
                        active={userFilter}
                        onChange={setUserFilter}
                        tabs={[
                          { key: 'all',         label: 'All',    count: filterCounts.all },
                          { key: 'active',      label: 'Active', count: filterCounts.active },
                          { key: 'deactivated', label: 'Off',    count: filterCounts.deactivated },
                        ]}
                      />
                    </div>

                    {/* Search */}
                    <div className="relative mb-4">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400 text-sm pointer-events-none">⌕</span>
                      <input
                        type="text" placeholder="Search users…" value={userSearch}
                        onChange={e => setUserSearch(e.target.value)}
                        className="w-full pl-9 pr-8 py-2.5 text-sm border border-stone-200 bg-white text-stone-900 placeholder-stone-400 rounded-xl focus:outline-none focus:border-red-300 focus:ring-2 focus:ring-red-500/10 transition-all"
                      />
                      {userSearch && (
                        <button onClick={() => setUserSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 text-xs">✕</button>
                      )}
                    </div>

                    <div className="content-card">
                      {filteredUsers.length === 0 ? (
                        <div className="py-16 text-center">
                          <p className="text-sm text-stone-400 italic">{userSearch ? `No users matching "${userSearch}"` : 'No users found'}</p>
                        </div>
                      ) : (
                        <>
                          {/* Mobile */}
                          <div className="sm:hidden">
                            {filteredUsers.map((u, idx) => (
                              <UserMobileCard key={u._id} u={u} warnCount={warnCounts[u._id] ?? 0}
                                onDeactivate={confirmDeleteUser} onRestore={confirmRestoreUser}
                                onWarn={handleOpenWarnModal} onPermDelete={confirmPermDeleteUser}
                                isLast={idx === filteredUsers.length - 1} />
                            ))}
                          </div>
                          {/* Desktop */}
                          <div className="hidden sm:block overflow-x-auto">
                            <table className="users-table text-sm border-collapse">
                              <thead>
                                <tr className="border-b border-stone-100 bg-stone-50/80">
                                  <th className="ucol-user px-4 py-3.5 text-left text-[10px] font-bold uppercase tracking-[0.14em] text-stone-400">User</th>
                                  <th className="ucol-status px-4 py-3.5 text-left text-[10px] font-bold uppercase tracking-[0.14em] text-stone-400">Status</th>
                                  <th className="ucol-actions px-4 py-3.5 text-right text-[10px] font-bold uppercase tracking-[0.14em] text-stone-400">Actions</th>
                                </tr>
                              </thead>
                              <tbody>
                                {filteredUsers.map((u, idx) => (
                                  <tr key={u._id}
                                    className={`req-item ${u.isDeleted ? 'opacity-60' : ''} ${u.role === 'admin' ? 'opacity-40' : ''} ${idx < filteredUsers.length - 1 ? 'border-b border-stone-100' : ''}`}>
                                    <td className="ucol-user px-4 py-3.5">
                                      <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-stone-100 border border-stone-200 flex items-center justify-center text-xs font-bold text-stone-600 shrink-0 select-none">
                                          {u.name?.[0]?.toUpperCase() ?? '?'}
                                        </div>
                                        <div className="min-w-0">
                                          <div className="flex items-center gap-1.5 flex-wrap">
                                            <span className="font-semibold text-stone-900 text-sm cell-truncate">{u.name}</span>
                                            {u.role === 'admin' && (
                                              <span className="inline-flex items-center border border-stone-300 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-widest text-stone-500 bg-stone-50 rounded-md shrink-0">Admin</span>
                                            )}
                                            {u.isVerified && (
                                              <span className="px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded-full bg-green-50 text-green-600 border border-green-200 shrink-0">✔ Verified</span>
                                            )}
                                          </div>
                                          <div className="text-xs text-stone-400 mt-0.5 cell-truncate">{u.email}</div>
                                        </div>
                                      </div>
                                    </td>
                                    <td className="ucol-status px-4 py-3.5">
                                      <span className={`inline-flex items-center border px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest rounded-lg ${u.isDeleted ? 'border-red-200 text-red-600 bg-red-50' : 'border-green-200 text-green-700 bg-green-50'}`}>
                                        {u.isDeleted ? 'Deactivated' : 'Active'}
                                      </span>
                                    </td>
                                    <td className="ucol-actions px-4 py-3.5">
                                      <div className="flex justify-end">
                                        <ActionButtons u={u} warnCount={warnCounts[u._id] ?? 0}
                                          onWarn={handleOpenWarnModal} onDeactivate={confirmDeleteUser}
                                          onRestore={confirmRestoreUser} onPermDelete={confirmPermDeleteUser} />
                                      </div>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                </div>{/* end right column inner */}
              </div>{/* end RIGHT COLUMN */}

            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;