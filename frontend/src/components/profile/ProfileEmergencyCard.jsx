/**
 * ProfileEmergencyCard.jsx — AdminDashboard Design Match
 *
 * Uses content-card, Fraunces headings, DM Sans body.
 * Badges match AdminDashboard badge style (rounded-lg, tracking-widest).
 * Edit / Cancel buttons match AdminDashboard action button patterns.
 *
 * ✅ All props / logic / callbacks unchanged
 */

import React, { useState } from 'react';
import EmergencyProfileForm from '../EmergencyProfileForm';

const BLOOD_GROUP_COLORS = {
  'A+':  '#dc2626', 'A-':  '#b91c1c',
  'B+':  '#d97706', 'B-':  '#b45309',
  'AB+': '#7c3aed', 'AB-': '#6d28d9',
  'O+':  '#16a34a', 'O-':  '#15803d',
};

const NOT_PROVIDED = (
  <span style={{ color: '#d6d3d1', fontStyle: 'italic', fontSize: '0.8rem' }}>Not provided</span>
);

// ── Atoms ────────────────────────────────────────────────────────────────────

const Tag = ({ label }) => (
  <span
    style={{
      display: 'inline-block', padding: '3px 10px',
      fontSize: '0.6rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em',
      borderRadius: 8,
      background: 'rgba(0,0,0,0.04)', color: '#78716c',
      border: '1px solid rgba(0,0,0,0.07)',
    }}
  >
    {label}
  </span>
);

const FieldLabel = ({ text }) => (
  <span style={{
    fontSize: '0.6rem', textTransform: 'uppercase',
    letterSpacing: '0.14em', color: '#a8a29e', fontWeight: 700, display: 'block',
  }}>
    {text}
  </span>
);

const InfoBlock = ({ label, children, fallback = true }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
    <FieldLabel text={label} />
    {children || (fallback ? NOT_PROVIDED : null)}
  </div>
);

const Divider = () => (
  <div style={{ height: 1, background: '#f5f3f0' }} />
);

// Matches AdminDashboard SectionLabel
const SectionLabel = ({ text, badge }) => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
    <h2
      style={{
        fontFamily: "'Fraunces', Georgia, serif",
        fontSize: '1rem', fontWeight: 600,
        color: '#1c1917', letterSpacing: '-0.01em', margin: 0,
      }}
    >
      {text}
    </h2>
    {badge}
  </div>
);

const StatusBadge = ({ set }) => (
  <span
    style={{
      display: 'inline-flex', alignItems: 'center',
      fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em',
      padding: '3px 10px', borderRadius: 8,
      ...(set
        ? { background: 'rgba(22,163,74,0.07)', color: '#16a34a', border: '1px solid rgba(22,163,74,0.2)' }
        : { background: 'rgba(220,38,38,0.07)', color: '#dc2626', border: '1px solid rgba(220,38,38,0.2)' }),
    }}
  >
    {set ? '✓ Set' : '! Not set'}
  </span>
);

// ── Empty state ───────────────────────────────────────────────────────────────

const EmptyStateCTA = ({ onSetUp }) => (
  <div className="content-card" style={{ padding: '2rem 1.5rem' }}>
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '1rem' }}>
      <div
        style={{
          width: 44, height: 44, borderRadius: 12,
          background: 'rgba(220,38,38,0.07)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <path d="M10 4v12M4 10h12" stroke="#dc2626" strokeWidth="2" strokeLinecap="round"/>
        </svg>
      </div>

      <div style={{ maxWidth: 260 }}>
        <p style={{
          fontFamily: "'Fraunces', Georgia, serif",
          fontSize: '1rem', fontWeight: 600, color: '#1c1917', marginBottom: 6,
        }}>
          Emergency profile not set
        </p>
        <p style={{ fontSize: '0.78rem', color: '#a8a29e', lineHeight: 1.55 }}>
          Add your medical details to receive faster and safer help during emergencies.
        </p>
      </div>

      <button
        onClick={onSetUp}
        className="btn-danger"
        style={{
          marginTop: 4, padding: '10px 28px',
          background: '#dc2626', color: '#fff',
          fontSize: '0.65rem', fontWeight: 700,
          textTransform: 'uppercase', letterSpacing: '0.14em',
          borderRadius: 999, border: 'none', cursor: 'pointer',
          transition: 'background 0.15s',
        }}
        onMouseEnter={e => (e.currentTarget.style.background = '#b91c1c')}
        onMouseLeave={e => (e.currentTarget.style.background = '#dc2626')}
      >
        Set Up Emergency Profile
      </button>

      <p style={{
        fontSize: '0.6rem', color: '#d6d3d1',
        textTransform: 'uppercase', letterSpacing: '0.14em',
        fontWeight: 600, marginTop: -4,
      }}>
        Takes less than 30 seconds
      </p>
    </div>
  </div>
);

// ── Filled state ──────────────────────────────────────────────────────────────

const FilledView = ({ profile, onEdit }) => {
  const bgColor = BLOOD_GROUP_COLORS[profile.bloodGroup] || '#78716c';
  const hasTags = (arr) => Array.isArray(arr) && arr.length > 0;

  return (
    <div className="content-card">

      {/* Blood group header — matches AdminDashboard card header pattern */}
      <div
        style={{
          padding: '1rem 1.5rem',
          background: `${bgColor}09`,
          borderBottom: `1px solid ${bgColor}18`,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          {profile.bloodGroup ? (
            <>
              <div
                style={{
                  width: 44, height: 44, borderRadius: 10,
                  background: bgColor, flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#fff',
                  fontFamily: "'Fraunces', serif",
                  fontSize: '1rem', fontWeight: 600,
                }}
              >
                {profile.bloodGroup}
              </div>
              <div>
                <FieldLabel text="Blood Group" />
                <span style={{
                  fontFamily: "'Fraunces', serif",
                  fontSize: '1.1rem', fontWeight: 600, color: '#1c1917', display: 'block', marginTop: 3,
                }}>
                  {profile.bloodGroup}
                </span>
              </div>
            </>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 44, height: 44, borderRadius: 10, background: 'rgba(0,0,0,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}>🩸</div>
              <div>
                <FieldLabel text="Blood Group" />
                <div style={{ marginTop: 3 }}>{NOT_PROVIDED}</div>
              </div>
            </div>
          )}
        </div>

        {/* Edit — matches AdminDashboard icon-adjacent action buttons */}
        <button
          onClick={onEdit}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            padding: '6px 14px',
            fontSize: '0.6rem', fontWeight: 700,
            textTransform: 'uppercase', letterSpacing: '0.12em',
            borderRadius: 10, border: '1px solid rgba(0,0,0,0.1)',
            background: '#fff', color: '#78716c', cursor: 'pointer',
            transition: 'border-color 0.15s, color 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = '#1c1917'; e.currentTarget.style.color = '#1c1917'; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(0,0,0,0.1)'; e.currentTarget.style.color = '#78716c'; }}
        >
          <svg width="10" height="10" viewBox="0 0 11 11" fill="none">
            <path d="M7.5 1.5l2 2-6 6H1.5v-2l6-6z" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Edit
        </button>
      </div>

      {/* Medical fields */}
      <div style={{ padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>

        <InfoBlock label="Allergies">
          {hasTags(profile.allergies) && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {profile.allergies.map((a, i) => <Tag key={i} label={a} />)}
            </div>
          )}
        </InfoBlock>
        <Divider />

        <InfoBlock label="Medical Conditions">
          {hasTags(profile.medicalConditions) && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {profile.medicalConditions.map((c, i) => <Tag key={i} label={c} />)}
            </div>
          )}
        </InfoBlock>
        <Divider />

        <InfoBlock label="Current Medications">
          {hasTags(profile.medications) && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {profile.medications.map((m, i) => <Tag key={i} label={m} />)}
            </div>
          )}
        </InfoBlock>
        <Divider />

        <InfoBlock label="Disability / Accessibility Needs">
          {profile.disabilityInfo && (
            <p style={{ fontSize: '0.82rem', color: '#57534e', lineHeight: 1.55, margin: 0 }}>{profile.disabilityInfo}</p>
          )}
        </InfoBlock>
        <Divider />

        <InfoBlock label="Special Instructions">
          {profile.specialInstructions && (
            <p style={{ fontSize: '0.82rem', color: '#57534e', lineHeight: 1.55, margin: 0 }}>{profile.specialInstructions}</p>
          )}
        </InfoBlock>

        <>
          <Divider />
          <InfoBlock label="Emergency Contacts" fallback={false}>
            {Array.isArray(profile.emergencyContacts) && profile.emergencyContacts.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 2 }}>
                {profile.emergencyContacts.map((c, i) => (
                  <div
                    key={i}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      padding: '10px 14px', borderRadius: 12,
                      background: 'rgba(0,0,0,0.025)', border: '1px solid rgba(0,0,0,0.05)',
                    }}
                  >
                    <div
                      style={{
                        width: 32, height: 32, borderRadius: '50%',
                        background: '#d6d3d1',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '0.75rem', fontWeight: 700, color: '#fff', flexShrink: 0,
                      }}
                    >
                      {c.name?.[0]?.toUpperCase() || '?'}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#1c1917', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {c.name || NOT_PROVIDED}
                      </div>
                      <div style={{ fontSize: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#a8a29e', marginTop: 2 }}>
                        {[c.relationship, c.phone].filter(Boolean).join(' · ') || 'No details'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : NOT_PROVIDED}
          </InfoBlock>
        </>
      </div>
    </div>
  );
};

// ── Edit mode ─────────────────────────────────────────────────────────────────

const EditMode = ({ onSaved, onCancel }) => (
  <div className="content-card" style={{ padding: '1.5rem' }}>
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
      <span style={{
        fontFamily: "'Fraunces', Georgia, serif",
        fontSize: '0.95rem', fontWeight: 600, color: '#1c1917',
      }}>
        Edit Emergency Profile
      </span>
      <button
        onClick={onCancel}
        style={{
          fontSize: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.14em',
          fontWeight: 700, color: '#a8a29e', background: 'none', border: 'none',
          cursor: 'pointer', transition: 'color 0.15s',
        }}
        onMouseEnter={e => (e.currentTarget.style.color = '#dc2626')}
        onMouseLeave={e => (e.currentTarget.style.color = '#a8a29e')}
      >
        Cancel
      </button>
    </div>
    <EmergencyProfileForm onSaved={onSaved} />
  </div>
);

// ── Main export ───────────────────────────────────────────────────────────────

const ProfileEmergencyCard = ({ emergencyProfile, onUpdate }) => {
  const [isEditing, setIsEditing] = useState(false);

  const handleSaveSuccess = () => {
    setIsEditing(false);
    onUpdate();
  };

  return (
    <div>
      <SectionLabel
        text="Emergency Profile"
        badge={!isEditing && <StatusBadge set={!!emergencyProfile} />}
      />

      {isEditing ? (
        <EditMode onSaved={handleSaveSuccess} onCancel={() => setIsEditing(false)} />
      ) : emergencyProfile ? (
        <FilledView profile={emergencyProfile} onEdit={() => setIsEditing(true)} />
      ) : (
        <EmptyStateCTA onSetUp={() => setIsEditing(true)} />
      )}
    </div>
  );
};

export default ProfileEmergencyCard;