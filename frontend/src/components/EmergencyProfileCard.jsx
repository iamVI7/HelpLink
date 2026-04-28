import React, { useState } from 'react';

// ─────────────────────────────────────────────────────────────────────────────
// EmergencyProfileCard
//
// Renders a request's `emergencyProfileSnapshot` field.
//
// Visibility rules (matching backend privacy model):
//   isOwner || isHelper → full profile
//   otherwise          → blood group only
//
// Props:
//   snapshot   — request.emergencyProfileSnapshot (may be null)
//   isOwner    — boolean: current user created this request
//   isHelper   — boolean: current user accepted this request
//   compact    — boolean: smaller inline variant (default false)
// ─────────────────────────────────────────────────────────────────────────────

const Pill = ({ children, color = 'stone' }) => {
  const colors = {
    stone: 'bg-stone-50 border-stone-200 text-stone-600',
    red:   'bg-red-50 border-red-200 text-red-700',
    amber: 'bg-amber-50 border-amber-200 text-amber-700',
    green: 'bg-green-50 border-green-200 text-green-700',
  };
  return (
    <span className={`inline-flex items-center border px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest rounded-lg ${colors[color]}`}>
      {children}
    </span>
  );
};

const Row = ({ label, value }) => {
  if (!value && value !== 0) return null;
  return (
    <div className="flex items-start gap-2 min-w-0">
      <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-stone-400 whitespace-nowrap pt-0.5 w-28 shrink-0">
        {label}
      </span>
      <span className="text-xs text-stone-700 leading-relaxed min-w-0 break-words">
        {value}
      </span>
    </div>
  );
};

const TagRow = ({ label, items }) => {
  if (!items?.length) return null;
  return (
    <div className="flex items-start gap-2">
      <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-stone-400 whitespace-nowrap pt-1 w-28 shrink-0">
        {label}
      </span>
      <div className="flex flex-wrap gap-1">
        {items.map((item, i) => (
          <span
            key={i}
            className="inline-flex px-2 py-0.5 text-[10px] font-semibold rounded-md border border-stone-200 bg-stone-50 text-stone-600"
          >
            {item}
          </span>
        ))}
      </div>
    </div>
  );
};

const EmergencyProfileCard = ({ snapshot, isOwner = false, isHelper = false, compact = false }) => {
  const [expanded, setExpanded] = useState(false);

  // ── Nothing to show ───────────────────────────────────────────────────────
  if (!snapshot) return null;

  const canSeeFullProfile = isOwner || isHelper;
  const showFull = canSeeFullProfile && expanded;

  const bloodGroupColor =
    snapshot.bloodGroup
      ? snapshot.bloodGroup.includes('+') ? 'red' : 'amber'
      : 'stone';

  return (
    <div
      className={`rounded-xl border overflow-hidden ${compact ? '' : 'mt-3 ml-7'}`}
      style={{
        borderColor: 'rgba(220,38,38,0.15)',
        background: 'rgba(254,242,242,0.4)',
        fontFamily: "'DM Sans', sans-serif",
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3.5 py-2.5 border-b" style={{ borderColor: 'rgba(220,38,38,0.1)' }}>
        <div className="flex items-center gap-2">
          <span className="text-[10px]">🩺</span>
          <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-red-600">
            Emergency Profile
          </span>
          {snapshot.isVerified && (
            <svg width="13" height="13" viewBox="0 0 20 20" fill="none" className="shrink-0">
              <circle cx="10" cy="10" r="10" fill="#22c55e" />
              <path d="M6 10.2L8.8 13L14 7.5" stroke="white" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </div>

        {/* Blood group always visible */}
        {snapshot.bloodGroup && (
          <Pill color={bloodGroupColor}>
            🩸 {snapshot.bloodGroup}
          </Pill>
        )}
      </div>

      {/* Body */}
      <div className="px-3.5 py-3 space-y-2">

        {/* Always visible: blood group summary row */}
        {!snapshot.bloodGroup && (
          <p className="text-[10px] text-stone-400 italic">Blood group not specified</p>
        )}

        {/* Locked state for non-owners / non-helpers */}
        {!canSeeFullProfile && (
          <div className="flex items-center gap-2 py-1">
            <svg className="w-3 h-3 text-stone-400 shrink-0" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 1a2 2 0 0 1 2 2v4H6V3a2 2 0 0 1 2-2zm3 6V3a3 3 0 0 0-6 0v4a2 2 0 0 0-2 2v5a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2H5z"/>
            </svg>
            <span className="text-[10px] text-stone-400 italic">
              Full details visible to accepted helper only
            </span>
          </div>
        )}

        {/* Expand toggle for eligible users */}
        {canSeeFullProfile && (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-red-600 hover:text-red-800 transition-colors"
          >
            <svg
              className={`w-3 h-3 transition-transform duration-200 ${showFull ? 'rotate-180' : ''}`}
              fill="none" stroke="currentColor" viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
            {showFull ? 'Hide details' : 'View full profile'}
          </button>
        )}

        {/* Full profile details */}
        {showFull && (
          <div className="pt-2 space-y-2.5 border-t border-red-100 mt-2">

            {snapshot.name && (
              <Row label="Name" value={snapshot.name} />
            )}
            {snapshot.phoneNumber && (
              <Row label="Phone" value={snapshot.phoneNumber} />
            )}
            {snapshot.address && (
              <Row label="Address" value={snapshot.address} />
            )}

            <TagRow label="Allergies"   items={snapshot.allergies} />
            <TagRow label="Conditions"  items={snapshot.medicalConditions} />
            <TagRow label="Medications" items={snapshot.medications} />

            {snapshot.disabilityInfo && (
              <Row label="Accessibility" value={snapshot.disabilityInfo} />
            )}
            {snapshot.specialInstructions && (
              <Row label="Instructions" value={snapshot.specialInstructions} />
            )}

            {/* Emergency contacts */}
            {snapshot.emergencyContacts?.length > 0 && (
              <div className="pt-1">
                <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-stone-400 mb-2">
                  Emergency Contacts
                </p>
                <div className="space-y-1.5">
                  {snapshot.emergencyContacts.map((c, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-3 px-3 py-2 rounded-lg bg-white border border-stone-200 text-xs text-stone-700"
                    >
                      <span className="font-semibold truncate">{c.name}</span>
                      {c.relationship && (
                        <span className="text-stone-400 shrink-0">· {c.relationship}</span>
                      )}
                      {c.phone && (
                        <a
                          href={`tel:${c.phone}`}
                          className="ml-auto font-bold text-red-600 hover:text-red-800 shrink-0 transition-colors"
                        >
                          {c.phone}
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Snapshot timestamp */}
            {snapshot.capturedAt && (
              <p className="text-[9px] text-stone-300 pt-1">
                Captured at: {new Date(snapshot.capturedAt).toLocaleString('en-GB', {
                  day: '2-digit', month: 'short', year: 'numeric',
                  hour: '2-digit', minute: '2-digit'
                })}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default EmergencyProfileCard;