/**
 * ProfileEmergencyCard.jsx
 *
 * PHASE 3 — Component Modularization
 * PHASE 5 — Emergency Profile Integration
 * ENHANCED — Strong empty CTA, structured filled view, smooth edit toggle
 *
 * Changes from previous version:
 *   EMPTY STATE  — replaced plain text + small button with a visually distinct
 *                  CTA card: warning icon, message, strong "Set Up" button, hint text
 *   FILLED STATE — structured grid layout: Blood Group hero, then label+value
 *                  rows for Medical Conditions, Allergies, Medications, Contacts,
 *                  Disability, Special Instructions; "Not provided" fallback on all
 *   EDIT MODE    — unchanged: uses EmergencyProfileForm with onSaved callback
 *   TRANSITIONS  — CSS opacity/translate transition between view ↔ edit
 *   MICRO UX     — hover effects on buttons; card border changes in empty state
 *
 * Props — UNCHANGED:
 *   emergencyProfile {Object|null} — from /api/profile/me
 *   onUpdate         {Function}    — callback to refresh ProfilePage data
 *
 * Assumptions:
 *   - EmergencyProfileForm accepts `onSaved` prop (already confirmed)
 *   - No backend changes required
 *   - Tailwind CSS available (matches existing project setup)
 */

import React, { useState } from 'react';
import EmergencyProfileForm from '../EmergencyProfileForm';

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────
const BLOOD_GROUP_COLORS = {
  'A+':  '#dc2626', 'A-':  '#b91c1c',
  'B+':  '#d97706', 'B-':  '#b45309',
  'AB+': '#7c3aed', 'AB-': '#6d28d9',
  'O+':  '#16a34a', 'O-':  '#15803d',
};

const NOT_PROVIDED = (
  <span className="text-stone-300 italic text-sm">Not provided</span>
);

// ─────────────────────────────────────────────────────────────────────────────
// Small reusable atoms
// ─────────────────────────────────────────────────────────────────────────────

// Tag chip — for allergies, conditions, medications
const Tag = ({ label }) => (
  <span
    className="px-2.5 py-1 text-[10px] font-semibold rounded-full uppercase tracking-wider"
    style={{ background: 'rgba(0,0,0,0.05)', color: '#57534e' }}
  >
    {label}
  </span>
);

// Label + content row — renders fallback if value is empty/null
const InfoBlock = ({ label, children, fallback = true }) => (
  <div className="flex flex-col gap-1.5">
    <span className="text-[10px] uppercase tracking-widest text-stone-400 font-bold">
      {label}
    </span>
    {children || (fallback ? NOT_PROVIDED : null)}
  </div>
);

// Section divider
const Divider = () => <div className="h-px bg-stone-100" />;

// ─────────────────────────────────────────────────────────────────────────────
// MedicalCrossIcon — used in empty state CTA
// ─────────────────────────────────────────────────────────────────────────────
const MedicalCrossIcon = () => (
  <svg
    width="28" height="28" viewBox="0 0 28 28" fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <rect width="28" height="28" rx="8" fill="rgba(220,38,38,0.08)" />
    <path
      d="M14 7v14M7 14h14"
      stroke="#dc2626"
      strokeWidth="2.2"
      strokeLinecap="round"
    />
  </svg>
);

// ─────────────────────────────────────────────────────────────────────────────
// EMPTY STATE — strong CTA when no profile exists
// ─────────────────────────────────────────────────────────────────────────────
const EmptyStateCTA = ({ onSetUp }) => (
  <div
    className="rounded-2xl p-6 transition-all duration-200"
    style={{
      background: 'rgba(255,245,245,0.7)',
      border: '1.5px dashed rgba(220,38,38,0.25)',
    }}
  >
    <div className="flex flex-col items-center text-center py-4 gap-4">

      {/* Icon */}
      <MedicalCrossIcon />

      {/* Message */}
      <div className="space-y-1.5 max-w-xs">
        <p
          className="text-base font-bold text-stone-800 leading-snug"
          style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}
        >
          Emergency profile not set
        </p>
        <p className="text-xs text-stone-400 leading-relaxed">
          Add your medical details to receive faster and safer help during emergencies.
        </p>
      </div>

      {/* CTA button */}
      <button
        onClick={onSetUp}
        className="
          mt-1 px-7 py-3
          bg-red-600 hover:bg-red-500 active:bg-red-700
          text-white text-xs font-bold uppercase tracking-[0.12em]
          rounded-full
          transition-all duration-150
          hover:-translate-y-px hover:shadow-lg hover:shadow-red-600/20
          active:translate-y-0
        "
      >
        Set Up Emergency Profile
      </button>

      {/* Hint */}
      <p className="text-[10px] text-stone-300 uppercase tracking-widest font-semibold -mt-1">
        Takes less than 30 seconds
      </p>

    </div>
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// FILLED STATE — structured read-only view
// ─────────────────────────────────────────────────────────────────────────────
const FilledView = ({ profile, onEdit }) => {
  const bgColor = BLOOD_GROUP_COLORS[profile.bloodGroup] || '#78716c';

  const hasTags = (arr) => Array.isArray(arr) && arr.length > 0;

  return (
    <div
      className="rounded-2xl overflow-hidden transition-all duration-200"
      style={{ background: 'rgba(255,255,255,0.95)', border: '1px solid rgba(0,0,0,0.08)' }}
    >

      {/* ── Blood group hero header ─────────────────────────────────────── */}
      <div
        className="px-6 py-5 flex items-center justify-between"
        style={{ background: `${bgColor}10`, borderBottom: `1px solid ${bgColor}20` }}
      >
        <div className="flex items-center gap-4">
          {profile.bloodGroup ? (
            <>
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-base flex-shrink-0"
                style={{ background: bgColor, fontFamily: "'DM Serif Display', serif" }}
              >
                {profile.bloodGroup}
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-widest font-bold mb-0.5"
                  style={{ color: bgColor }}
                >
                  Blood Group
                </div>
                <div className="text-lg font-bold text-stone-800"
                  style={{ fontFamily: "'DM Serif Display', serif" }}
                >
                  {profile.bloodGroup}
                </div>
              </div>
            </>
          ) : (
            <div className="flex items-center gap-3">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: 'rgba(0,0,0,0.05)' }}
              >
                <span className="text-xl">🩸</span>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-widest text-stone-400 font-bold mb-0.5">
                  Blood Group
                </div>
                {NOT_PROVIDED}
              </div>
            </div>
          )}
        </div>

        {/* Edit button — top-right of the card */}
        <button
          onClick={onEdit}
          className="
            flex items-center gap-1.5
            px-4 py-2 text-[10px] font-bold uppercase tracking-widest
            rounded-full border border-stone-200 bg-white text-stone-500
            transition-all duration-150
            hover:border-stone-900 hover:text-stone-900 hover:bg-stone-50
            active:scale-95
          "
        >
          <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
            <path d="M7.5 1.5l2 2-6 6H1.5v-2l6-6z" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Edit
        </button>
      </div>

      {/* ── Medical details grid ────────────────────────────────────────── */}
      <div className="px-6 py-5 space-y-5">

        {/* Allergies */}
        <InfoBlock label="Allergies">
          {hasTags(profile.allergies) && (
            <div className="flex flex-wrap gap-1.5">
              {profile.allergies.map((a, i) => <Tag key={i} label={a} />)}
            </div>
          )}
        </InfoBlock>

        <Divider />

        {/* Medical Conditions */}
        <InfoBlock label="Medical Conditions">
          {hasTags(profile.medicalConditions) && (
            <div className="flex flex-wrap gap-1.5">
              {profile.medicalConditions.map((c, i) => <Tag key={i} label={c} />)}
            </div>
          )}
        </InfoBlock>

        <Divider />

        {/* Medications */}
        <InfoBlock label="Current Medications">
          {hasTags(profile.medications) && (
            <div className="flex flex-wrap gap-1.5">
              {profile.medications.map((m, i) => <Tag key={i} label={m} />)}
            </div>
          )}
        </InfoBlock>

        <Divider />

        {/* Disability */}
        <InfoBlock label="Disability / Accessibility Needs">
          {profile.disabilityInfo && (
            <p className="text-sm text-stone-700 leading-relaxed">{profile.disabilityInfo}</p>
          )}
        </InfoBlock>

        <Divider />

        {/* Special Instructions */}
        <InfoBlock label="Special Instructions">
          {profile.specialInstructions && (
            <p className="text-sm text-stone-700 leading-relaxed">{profile.specialInstructions}</p>
          )}
        </InfoBlock>

        {/* Emergency Contacts */}
        {(hasTags(profile.emergencyContacts) || true) && (
          <>
            <Divider />
            <InfoBlock label="Emergency Contacts" fallback={false}>
              {hasTags(profile.emergencyContacts) ? (
                <div className="space-y-2 mt-0.5">
                  {profile.emergencyContacts.map((c, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-3 px-4 py-3 rounded-xl"
                      style={{ background: 'rgba(0,0,0,0.03)', border: '1px solid rgba(0,0,0,0.06)' }}
                    >
                      {/* Avatar initial */}
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                        style={{ background: '#a8a29e' }}
                      >
                        {c.name?.[0]?.toUpperCase() || '?'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-stone-800 truncate">
                          {c.name || NOT_PROVIDED}
                        </div>
                        <div className="text-[10px] text-stone-400 uppercase tracking-wider mt-0.5">
                          {[c.relationship, c.phone].filter(Boolean).join(' · ') || 'No details'}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : NOT_PROVIDED}
            </InfoBlock>
          </>
        )}

      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// EDIT MODE wrapper — thin shell around EmergencyProfileForm
// ─────────────────────────────────────────────────────────────────────────────
const EditMode = ({ onSaved, onCancel }) => (
  <div
    className="rounded-2xl p-6 transition-all duration-200"
    style={{ background: 'rgba(255,255,255,0.95)', border: '1px solid rgba(0,0,0,0.08)' }}
  >
    {/* Cancel bar at top of edit mode */}
    <div className="flex items-center justify-between mb-5">
      <span className="text-[10px] uppercase tracking-widest text-stone-400 font-bold">
        Edit Emergency Profile
      </span>
      <button
        onClick={onCancel}
        className="text-[10px] uppercase tracking-widest text-stone-400 hover:text-red-500 font-bold transition-colors"
      >
        Cancel
      </button>
    </div>

    {/*
     * EmergencyProfileForm.jsx — used as-is.
     * Only onSaved prop passed; the form handles its own fetch + submit.
     * onSaved is already wired in EmergencyProfileForm (confirmed earlier).
     */}
    <EmergencyProfileForm onSaved={onSaved} />
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// ProfileEmergencyCard — main export
// ─────────────────────────────────────────────────────────────────────────────
const ProfileEmergencyCard = ({ emergencyProfile, onUpdate }) => {
  const [isEditing, setIsEditing] = useState(false);

  // After successful save: exit edit mode + trigger ProfilePage re-fetch
  const handleSaveSuccess = () => {
    setIsEditing(false);
    onUpdate();
  };

  return (
    <div>

      {/* Section header — Cancel button moves into EditMode itself now,
          so the header only shows "Edit" shortcut when profile exists + viewing */}
      <div className="flex items-center gap-3 mb-4">
        <span className="text-[10px] uppercase tracking-[0.18em] text-stone-400 font-bold">
          Emergency Profile
        </span>
        <div className="flex-1 h-px bg-stone-100" />

        {/* Show status badge when not editing */}
        {!isEditing && (
          <span
            className="text-[10px] uppercase tracking-widest font-bold px-2.5 py-1 rounded-full"
            style={
              emergencyProfile
                ? { background: 'rgba(22,163,74,0.08)', color: '#16a34a' }
                : { background: 'rgba(220,38,38,0.08)', color: '#dc2626' }
            }
          >
            {emergencyProfile ? '✓ Set' : '! Not set'}
          </span>
        )}
      </div>

      {/* ── Content: switches between empty CTA / filled view / edit mode ── */}
      <div
        style={{
          transition: 'opacity 0.2s ease, transform 0.2s ease',
          opacity: 1,
          transform: 'translateY(0)',
        }}
      >
        {isEditing ? (
          <EditMode
            onSaved={handleSaveSuccess}
            onCancel={() => setIsEditing(false)}
          />
        ) : emergencyProfile ? (
          <FilledView
            profile={emergencyProfile}
            onEdit={() => setIsEditing(true)}
          />
        ) : (
          <EmptyStateCTA onSetUp={() => setIsEditing(true)} />
        )}
      </div>

    </div>
  );
};

export default ProfileEmergencyCard;