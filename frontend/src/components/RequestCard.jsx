import React, { useEffect } from 'react';
import ReactDOM from 'react-dom';
import { useAuth } from '../context/AuthContext';
import { useRequests } from '../context/RequestContext';
import { useSocket } from '../context/SocketContext';
import { formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';
import EmergencyProfileCard from './EmergencyProfileCard';

// ─────────────────────────────────────────────────────────────
// ConfirmModal — portal, renders into document.body
// ─────────────────────────────────────────────────────────────
const ConfirmModal = ({
  open, onClose, onConfirm,
  title, description,
  confirmLabel = 'Confirm', variant = 'danger',
}) => {
  useEffect(() => {
    if (!open) return;
    const h = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', h);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;

  return ReactDOM.createPortal(
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '0 16px',
        backgroundColor: 'rgba(15, 13, 11, 0.55)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#fff',
          border: '1px solid rgba(0,0,0,0.06)',
          borderRadius: 24,
          width: '100%', maxWidth: 400,
          padding: '36px 32px',
          boxShadow: '0 40px 100px rgba(0,0,0,0.20), 0 8px 24px rgba(0,0,0,0.08)',
          animation: 'rcModalIn 0.26s cubic-bezier(0.34,1.56,0.64,1) both',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ marginBottom: 20 }}>
          <span style={{
            display: 'inline-block',
            fontSize: 9, fontWeight: 800, letterSpacing: '0.2em',
            textTransform: 'uppercase',
            color: variant === 'danger' ? '#dc2626' : '#16a34a',
            background: variant === 'danger' ? '#fef2f2' : '#f0fdf4',
            border: `1px solid ${variant === 'danger' ? '#fecaca' : '#bbf7d0'}`,
            borderRadius: 100, padding: '4px 12px',
          }}>
            {variant === 'danger' ? 'Confirm action' : 'Confirm'}
          </span>
        </div>
        <h3 style={{
          fontFamily: "'Fraunces', Georgia, serif",
          fontSize: '1.4rem', fontWeight: 600,
          color: '#1c1917', marginBottom: 10,
          lineHeight: 1.2, letterSpacing: '-0.02em',
        }}>
          {title}
        </h3>
        {description && (
          <p style={{
            fontSize: 13, color: '#a8a29e',
            lineHeight: 1.7, fontFamily: "'DM Sans', sans-serif",
          }}>
            {description}
          </p>
        )}
        <div style={{ display: 'flex', gap: 10, marginTop: 32 }}>
          <button
            onClick={onClose}
            style={{
              flex: 1, padding: '13px 0', borderRadius: 100,
              border: '1.5px solid #e7e3de', background: '#fff',
              fontSize: 11, fontWeight: 700, letterSpacing: '0.08em',
              textTransform: 'uppercase', color: '#78716c', cursor: 'pointer',
              fontFamily: "'DM Sans', sans-serif", transition: 'background 0.15s',
            }}
            onMouseEnter={e => e.currentTarget.style.background = '#faf9f7'}
            onMouseLeave={e => e.currentTarget.style.background = '#fff'}
          >
            Cancel
          </button>
          <button
            onClick={() => { onConfirm(); onClose(); }}
            style={{
              flex: 1, padding: '13px 0', borderRadius: 100,
              border: 'none',
              background: variant === 'danger' ? '#dc2626' : '#1c1917',
              fontSize: 11, fontWeight: 700, letterSpacing: '0.08em',
              textTransform: 'uppercase', color: '#fff', cursor: 'pointer',
              fontFamily: "'DM Sans', sans-serif",
              transition: 'filter 0.15s, box-shadow 0.15s',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.filter = 'brightness(1.1)';
              e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.18)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.filter = 'none';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
      <style>{`
        @keyframes rcModalIn {
          from { opacity: 0; transform: scale(0.93) translateY(10px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>
    </div>,
    document.body
  );
};

// ─────────────────────────────────────────────────────────────
// Design tokens
// ─────────────────────────────────────────────────────────────
const URGENCY_COLOR = {
  high:     { text: '#dc2626', bg: '#fef2f2', border: '#fecaca', dot: '#ef4444' },
  medium:   { text: '#d97706', bg: '#fffbeb', border: '#fde68a', dot: '#f59e0b' },
  low:      { text: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0', dot: '#22c55e' },
  critical: { text: '#dc2626', bg: '#fef2f2', border: '#fecaca', dot: '#ef4444' },
};

const STATUS_COLOR = {
  open:      { text: '#78716c', bg: '#f7f5f2', border: '#e7e3de', dot: '#c4b5a0' },
  accepted:  { text: '#2563eb', bg: '#eff6ff', border: '#bfdbfe', dot: '#3b82f6' },
  completed: { text: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0', dot: '#22c55e' },
};

const CATEGORY_ICON = {
  blood: '🩸', medical: '🏥', tools: '🔧',
  emergency: '🚨', critical: '🚨', other: '💡',
};

// ─────────────────────────────────────────────────────────────
// RequestCard
// ─────────────────────────────────────────────────────────────
const RequestCard = ({
  request,
  showActions = true,
  distanceLabel = null,
  noResponse = false,
  viewerCount,
}) => {
  const { user } = useAuth();
  const { acceptRequest, completeRequest } = useRequests();
  const { joinRequest, leaveRequest } = useSocket();

  const [isAccepting, setIsAccepting] = React.useState(false);
  const [modal, setModal] = React.useState({
    open: false, title: '', description: '',
    confirmLabel: 'Confirm', variant: 'danger', onConfirm: () => {},
  });

  const closeModal = React.useCallback(() => setModal((m) => ({ ...m, open: false })), []);
  const openModal  = React.useCallback((cfg) => setModal({ open: true, ...cfg }), []);

  useEffect(() => {
    if (!request?._id) return;
    joinRequest(request._id);
    return () => { leaveRequest(request._id); };
  }, [request?._id, joinRequest, leaveRequest]);

  const acceptedById  = request.acceptedBy?._id?.toString?.() ?? request.acceptedBy?.toString?.() ?? null;
  const createdById   = request.createdBy?._id?.toString?.()  ?? request.createdBy?.toString?.()  ?? null;
  const currentUserId = user?._id?.toString() ?? null;

  const isHelper        = !!currentUserId && currentUserId === acceptedById;
  const isOwner         = !!currentUserId && currentUserId === createdById;
  const isLockedByOther = request.status === 'accepted' && acceptedById && !isHelper;

  const timeAgo = request.createdAt
    ? formatDistanceToNow(new Date(request.createdAt), { addSuffix: true })
    : '';

  const urgency     = URGENCY_COLOR[request.urgency] ?? URGENCY_COLOR.low;
  const statusCol   = STATUS_COLOR[request.status]   ?? STATUS_COLOR.open;

  const handleAccept = () => {
    openModal({
      title: 'Accept this request?',
      description: 'You will be marked as the helper and notified of any updates.',
      confirmLabel: 'Accept',
      variant: 'danger',
      onConfirm: async () => {
        setIsAccepting(true);
        const result = await acceptRequest(request._id);
        if (!result.success) {
          toast.error(result.error || 'Request already accepted');
          setIsAccepting(false);
        }
      },
    });
  };

  const handleComplete = () => {
    openModal({
      title: 'Mark as completed?',
      description: 'This will close the request and notify everyone involved.',
      confirmLabel: 'Complete',
      variant: 'success',
      onConfirm: async () => { await completeRequest(request._id); },
    });
  };

  return (
    <>
      <ConfirmModal
        open={modal.open} onClose={closeModal} onConfirm={modal.onConfirm}
        title={modal.title} description={modal.description}
        confirmLabel={modal.confirmLabel} variant={modal.variant}
      />

      <style>{`
        @keyframes rcPulse {
          0%,100% { opacity:1; transform:scale(1); }
          50%      { opacity:0.4; transform:scale(1.6); }
        }
        @keyframes rcSpin {
          to { transform:rotate(360deg); }
        }
        .rc-card {
          padding: 20px 22px 18px;
          background: #fff;
          transition: background 0.14s;
          font-family: 'DM Sans','Helvetica Neue',sans-serif;
        }
        .rc-card:hover { background: #fdfcfb; }

        /* SOS banner — subtle, not a pill */
        .rc-sos-banner {
          display: flex; align-items: center; gap: 7px;
          margin-bottom: 12px;
          font-size: 9px; font-weight: 800; letter-spacing: .2em;
          text-transform: uppercase; color: #dc2626;
        }
        .rc-sos-dot {
          width: 6px; height: 6px; border-radius: 50%; background: #dc2626;
          flex-shrink: 0; animation: rcPulse 1.4s ease-in-out infinite;
        }

        /* Top row: icon + title + badges */
        .rc-top {
          display: flex; align-items: flex-start;
          justify-content: space-between; gap: 12px;
        }
        .rc-title-group { display: flex; align-items: flex-start; gap: 10px; min-width: 0; flex: 1; }
        .rc-emoji { font-size: 18px; flex-shrink: 0; margin-top: 1px; line-height: 1; }

        .rc-title {
          font-size: 14px; font-weight: 650; color: #1c1917;
          letter-spacing: -.018em; line-height: 1.3; margin: 0;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .rc-byline {
          display: flex; align-items: center; gap: 4px; flex-wrap: wrap;
          font-size: 11px; color: #a8a29e; font-weight: 500; margin-top: 3px;
        }
        .rc-byline-sep { color: #d4cfc9; }

        /* badges — only urgency + status, top-right */
        .rc-badge-group { display: flex; align-items: center; gap: 5px; flex-shrink: 0; }
        .rc-badge {
          display: inline-flex; align-items: center; gap: 4px;
          padding: 3px 9px; border-radius: 100px; border: 1px solid;
          font-size: 9px; font-weight: 800; letter-spacing: .1em; text-transform: uppercase;
        }
        .rc-bdot { width: 5px; height: 5px; border-radius: 50%; flex-shrink: 0; }

        /* Description — plain text, no box */
        .rc-desc {
          font-size: 12.5px; color: #78716c; line-height: 1.65;
          margin: 12px 0 0 28px;
        }

        /* Media */
        .rc-media-hint {
          font-size: 10.5px; color: #e07070; font-weight: 600;
          margin: 9px 0 0 28px; display: flex; align-items: center; gap: 5px;
        }
        .rc-media-img {
          display: block; margin: 10px 0 0 28px;
          width: calc(100% - 28px); max-width: 260px;
          border-radius: 12px; border: 1px solid #f0ece8; object-fit: cover;
        }

        /* Footer row — inline text, not pills */
        .rc-footer {
          display: flex; align-items: center; gap: 14px;
          margin: 13px 0 0 28px; flex-wrap: wrap;
        }
        .rc-footer-item {
          display: flex; align-items: center; gap: 4px;
          font-size: 11px; color: #b8b0a8; font-weight: 500;
        }
        .rc-footer-icon { font-size: 11px; }

        /* Inline status text (accepted / completed) */
        .rc-inline-status {
          display: inline-flex; align-items: center; gap: 5px;
          margin: 11px 0 0 28px;
          font-size: 10px; font-weight: 700; letter-spacing: .1em; text-transform: uppercase;
        }
        .rc-inline-dot { width: 5px; height: 5px; border-radius: 50%; flex-shrink: 0; }

        /* Helper text — subtle, inline */
        .rc-helper-text {
          display: flex; align-items: center; gap: 6px;
          margin: 9px 0 0 28px;
          font-size: 11.5px; color: #78716c;
        }

        /* "You accepted" / "You're helping" — just colored text */
        .rc-you-text {
          display: flex; align-items: center; gap: 6px;
          margin: 9px 0 0 28px;
          font-size: 10px; font-weight: 700; letter-spacing: .1em;
          text-transform: uppercase;
        }

        /* Warn tag — only noResponse, keep as small chip since it's an alert */
        .rc-warn {
          display: inline-flex; align-items: center; gap: 4px;
          font-size: 9px; font-weight: 800; letter-spacing: .12em; text-transform: uppercase;
          color: #b45309; background: #fffbeb; border: 1px solid #fde68a;
          border-radius: 6px; padding: 2px 8px;
        }

        /* Actions */
        .rc-actions { display: flex; align-items: center; gap: 9px; margin: 16px 0 0 28px; flex-wrap: wrap; }
        .rc-btn {
          display: inline-flex; align-items: center; gap: 6px;
          padding: 9px 18px; border-radius: 100px; border: none;
          font-size: 10px; font-weight: 800; letter-spacing: .1em; text-transform: uppercase;
          cursor: pointer; font-family: 'DM Sans', sans-serif;
          transition: filter .13s, box-shadow .13s, transform .08s;
        }
        .rc-btn:active { transform: scale(0.97); }
        .rc-btn-accept  { background: #dc2626; color: #fff; }
        .rc-btn-accept:hover  { filter: brightness(1.08); box-shadow: 0 5px 16px rgba(220,38,38,.28); }
        .rc-btn-complete { background: #1c1917; color: #fff; }
        .rc-btn-complete:hover { filter: brightness(1.12); box-shadow: 0 5px 16px rgba(0,0,0,.18); }
        .rc-btn-ghost {
          background: #f4f2f0; color: #c4b5a0;
          border: 1px solid #ede9e4; cursor: not-allowed; pointer-events: none;
        }
        .rc-spinner {
          width: 9px; height: 9px; border-radius: 50%;
          border: 2px solid rgba(255,255,255,.3); border-top-color: #fff;
          animation: rcSpin .7s linear infinite; display: inline-block;
        }
        .rc-recast {
          font-size: 9px; font-weight: 700; color: #b45309; letter-spacing: .08em;
        }
      `}</style>

      <div className="rc-card">

        {/* SOS — plain inline label, no pill box */}
        {request.isSOS && (
          <div className="rc-sos-banner">
            <span className="rc-sos-dot" />
            SOS Emergency
          </div>
        )}

        {/* Top row */}
        <div className="rc-top">
          <div className="rc-title-group">
            <span className="rc-emoji">{CATEGORY_ICON[request.category] ?? '📌'}</span>
            <div style={{ minWidth: 0, flex: 1 }}>
              <p className="rc-title">{request.title}</p>
              <div className="rc-byline">
                <span>
                  {request.createdBy?.name ||
                    (request.requesterType === 'guest' ? 'Guest' : 'Unknown')}
                  {request.createdBy?.isVerified && (
                    <span style={{ color: '#16a34a', marginLeft: 3, fontSize: 10 }}>✔</span>
                  )}
                </span>
                {timeAgo && <><span className="rc-byline-sep">·</span><span>{timeAgo}</span></>}
                {distanceLabel && <><span className="rc-byline-sep">·</span><span>{distanceLabel}</span></>}
              </div>
            </div>
          </div>

          {/* Only urgency + status badges — top right */}
          <div className="rc-badge-group">
            <span className="rc-badge" style={{
              background: urgency.bg, color: urgency.text, borderColor: urgency.border,
            }}>
              <span className="rc-bdot" style={{ background: urgency.dot }} />
              {request.urgency}
            </span>
            <span className="rc-badge" style={{
              background: statusCol.bg, color: statusCol.text, borderColor: statusCol.border,
            }}>
              <span className="rc-bdot" style={{ background: statusCol.dot }} />
              {request.status}
            </span>
          </div>
        </div>

        {/* Media hint */}
        {request.media?.images?.length > 0 && (
          <div className="rc-media-hint">📸 Media available</div>
        )}
        {request.media?.images?.map((img, index) =>
          img.url && (
            <img
              key={index}
              src={`http://localhost:5000${img.url}`}
              alt="incident"
              className="rc-media-img"
            />
          )
        )}

        {/* Description — plain text, indented to align with title */}
        {request.description && (
          <p className="rc-desc">{request.description}</p>
        )}

        {/* Footer — address, category, distance, viewers — plain inline text */}
        {(request.address || request.category || request.distance !== undefined || noResponse || (viewerCount && viewerCount > 1) || request.isRebroadcast) && (
          <div className="rc-footer">
            {request.address && (
              <span className="rc-footer-item">
                <span className="rc-footer-icon">📍</span>
                {request.address}
              </span>
            )}
            {request.category && (
              <span className="rc-footer-item" style={{ textTransform: 'uppercase', fontSize: 10, letterSpacing: '0.08em' }}>
                {request.category}
              </span>
            )}
            {request.distance !== undefined && (
              <span className="rc-footer-item">
                {request.distance < 1
                  ? `${(request.distance * 1000).toFixed(0)} m`
                  : `${request.distance.toFixed(1)} km`} · ~{request.eta} min
              </span>
            )}
            {viewerCount && viewerCount > 1 && (
              <span className="rc-footer-item">
                <span className="rc-footer-icon">👀</span>
                {viewerCount} viewing
              </span>
            )}
            {noResponse && <span className="rc-warn">⚠ No Response</span>}
            {request.isRebroadcast && (
              <span className="rc-recast">🔁 Expanded area</span>
            )}
          </div>
        )}

        {/* Status line — inline, not boxed */}
        {(request.status === 'accepted' || request.status === 'completed') && (
          <div className="rc-inline-status" style={{ color: statusCol.text }}>
            <span className="rc-inline-dot" style={{ background: statusCol.dot }} />
            {request.status === 'accepted' ? 'In Progress' : 'Completed'}
          </div>
        )}

        {/* Helper info */}
        {request.acceptedBy && request.status === 'accepted' && !isHelper && (
          <div className="rc-helper-text">
            <span>🤝</span>
            <span>
              Being helped by{' '}
              <strong style={{ color: '#1c1917', fontWeight: 650 }}>
                {request.acceptedBy?.name || 'User'}
              </strong>
            </span>
          </div>
        )}

        {request.status === 'accepted' && isHelper && (
          <div className="rc-you-text" style={{ color: '#16a34a' }}>
            <span>🤝</span> You accepted this request
          </div>
        )}

        {/* Emergency Profile */}
        {request.emergencyProfileSnapshot && (
          <EmergencyProfileCard
            snapshot={request.emergencyProfileSnapshot}
            isOwner={isOwner}
            isHelper={isHelper}
          />
        )}

        {/* Actions */}
        {showActions && (
          <div className="rc-actions">
            {request.status === 'open' && !isOwner && (
              <button
                onClick={handleAccept}
                disabled={isAccepting}
                className={`rc-btn ${isAccepting ? 'rc-btn-ghost' : 'rc-btn-accept'}`}
              >
                {isAccepting
                  ? <><span className="rc-spinner" /> Accepting…</>
                  : <>
                      <svg width="9" height="9" viewBox="0 0 10 10" fill="none">
                        <path d="M1.5 5l2.5 2.5 4.5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      Accept Request
                    </>
                }
              </button>
            )}

            {isLockedByOther && (
              <button disabled className="rc-btn rc-btn-ghost">
                👤 Someone is helping
              </button>
            )}

            {request.status === 'accepted' && isHelper && (
              <div className="rc-you-text" style={{ color: '#16a34a', margin: 0 }}>
                <span>🧭</span> You're helping
              </div>
            )}

            {request.status === 'accepted' && (isHelper || isOwner) && (
              <button onClick={handleComplete} className="rc-btn rc-btn-complete">
                <svg width="9" height="9" viewBox="0 0 10 10" fill="none">
                  <path d="M1.5 5l2.5 2.5 4.5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Mark as Completed
              </button>
            )}
          </div>
        )}

      </div>
    </>
  );
};

export default RequestCard;