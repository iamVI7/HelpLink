import React, { useState, useEffect } from 'react';
import { getEmergencyProfile, updateEmergencyProfile } from '../services/emergencyProfileService';
import toast from 'react-hot-toast';

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────
const arrayToString = (arr) => (Array.isArray(arr) ? arr.join(', ') : arr ?? '');
const stringToArray = (str) =>
  str
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

// ─────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────
const FieldLabel = ({ children, hint }) => (
  <div className="flex items-baseline justify-between mb-2">
    <label className="text-[10px] font-bold uppercase tracking-[0.16em] text-stone-400">
      {children}
    </label>
    {hint && (
      <span className="text-[10px] text-stone-300 tracking-wide">{hint}</span>
    )}
  </div>
);

const inputCls =
  'w-full px-3.5 py-2.5 text-sm border border-stone-200 rounded-xl bg-white text-stone-900 placeholder-stone-300 focus:outline-none focus:border-red-400 focus:ring-2 focus:ring-red-400/10 transition-all resize-none';

// ─────────────────────────────────────────────
// EmergencyProfileForm
// ─────────────────────────────────────────────
const EmergencyProfileForm = ({ onSaved, compact = false }) => {
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);

  const [form, setForm] = useState({
    bloodGroup:          '',
    allergies:           '',
    medicalConditions:   '',
    medications:         '',
    disabilityInfo:      '',
    specialInstructions: '',
    // Emergency contacts — up to 2
    emergencyContacts: [
      { name: '', relationship: '', phone: '' },
    ],
  });

  // ── Prefill from API ──────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const profile = await getEmergencyProfile();
        if (cancelled) return;
        if (profile) {
          setForm({
            bloodGroup:          profile.bloodGroup          ?? '',
            allergies:           arrayToString(profile.allergies),
            medicalConditions:   arrayToString(profile.medicalConditions),
            medications:         arrayToString(profile.medications),
            disabilityInfo:      profile.disabilityInfo      ?? '',
            specialInstructions: profile.specialInstructions ?? '',
            emergencyContacts:
              profile.emergencyContacts?.length
                ? profile.emergencyContacts.map((c) => ({
                    name:         c.name         ?? '',
                    relationship: c.relationship ?? '',
                    phone:        c.phone        ?? '',
                  }))
                : [{ name: '', relationship: '', phone: '' }],
          });
        }
      } catch {
        // silently ignore — form stays blank
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, []);

  // ── Field handlers ────────────────────────────────────────────────────────
  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  const setContact = (idx, key, value) =>
    setForm((f) => {
      const contacts = [...f.emergencyContacts];
      contacts[idx] = { ...contacts[idx], [key]: value };
      return { ...f, emergencyContacts: contacts };
    });

  const addContact = () => {
    if (form.emergencyContacts.length >= 3) return;
    setForm((f) => ({
      ...f,
      emergencyContacts: [...f.emergencyContacts, { name: '', relationship: '', phone: '' }],
    }));
  };

  const removeContact = (idx) =>
    setForm((f) => ({
      ...f,
      emergencyContacts: f.emergencyContacts.filter((_, i) => i !== idx),
    }));

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        bloodGroup:          form.bloodGroup          || null,
        allergies:           stringToArray(form.allergies),
        medicalConditions:   stringToArray(form.medicalConditions),
        medications:         stringToArray(form.medications),
        disabilityInfo:      form.disabilityInfo.trim()      || null,
        specialInstructions: form.specialInstructions.trim() || null,
        emergencyContacts:   form.emergencyContacts
          .filter((c) => c.name.trim() || c.phone.trim())
          .map((c) => ({
            name:         c.name.trim(),
            relationship: c.relationship.trim(),
            phone:        c.phone.trim(),
          })),
      };
      await updateEmergencyProfile(payload);
      toast.success('Emergency profile saved');
      onSaved?.();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  // ── Form ──────────────────────────────────────────────────────────────────
  return (
    <form onSubmit={handleSubmit} className="space-y-6">

      {/* Blood Group */}
      <div>
        <FieldLabel>Blood Group</FieldLabel>
        <select
          value={form.bloodGroup}
          onChange={(e) => set('bloodGroup', e.target.value)}
          className={inputCls}
          style={{ fontFamily: "'DM Sans', sans-serif" }}
        >
          <option value="">— Select blood group —</option>
          {BLOOD_GROUPS.map((bg) => (
            <option key={bg} value={bg}>{bg}</option>
          ))}
        </select>
      </div>

      {/* Two-column row: Allergies + Medical Conditions */}
      <div className={`grid gap-4 ${compact ? 'grid-cols-1' : 'sm:grid-cols-2'}`}>
        <div>
          <FieldLabel hint="comma-separated">Allergies</FieldLabel>
          <input
            type="text"
            value={form.allergies}
            onChange={(e) => set('allergies', e.target.value)}
            placeholder="e.g. Penicillin, Peanuts"
            className={inputCls}
          />
        </div>
        <div>
          <FieldLabel hint="comma-separated">Medical Conditions</FieldLabel>
          <input
            type="text"
            value={form.medicalConditions}
            onChange={(e) => set('medicalConditions', e.target.value)}
            placeholder="e.g. Diabetes, Hypertension"
            className={inputCls}
          />
        </div>
      </div>

      {/* Medications */}
      <div>
        <FieldLabel hint="comma-separated">Current Medications</FieldLabel>
        <input
          type="text"
          value={form.medications}
          onChange={(e) => set('medications', e.target.value)}
          placeholder="e.g. Metformin 500mg, Aspirin"
          className={inputCls}
        />
      </div>

      {/* Disability Info */}
      <div>
        <FieldLabel>Disability / Accessibility Needs</FieldLabel>
        <textarea
          rows={2}
          value={form.disabilityInfo}
          onChange={(e) => set('disabilityInfo', e.target.value)}
          placeholder="Any mobility, sensory, or cognitive needs responders should know…"
          className={inputCls}
        />
      </div>

      {/* Special Instructions */}
      <div>
        <FieldLabel>Special Instructions</FieldLabel>
        <textarea
          rows={2}
          value={form.specialInstructions}
          onChange={(e) => set('specialInstructions', e.target.value)}
          placeholder="Anything else that could help responders assist you…"
          className={inputCls}
        />
      </div>

      {/* Emergency Contacts */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <FieldLabel>Emergency Contacts</FieldLabel>
          {form.emergencyContacts.length < 3 && (
            <button
              type="button"
              onClick={addContact}
              className="text-[10px] font-bold uppercase tracking-widest text-red-600 hover:text-red-800 transition-colors"
            >
              + Add
            </button>
          )}
        </div>
        <div className="space-y-3">
          {form.emergencyContacts.map((c, idx) => (
            <div
              key={idx}
              className="p-3.5 rounded-xl border border-stone-200 bg-stone-50 space-y-2.5"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-widest text-stone-400">
                  Contact {idx + 1}
                </span>
                {form.emergencyContacts.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeContact(idx)}
                    className="text-[10px] text-stone-400 hover:text-red-600 font-bold uppercase tracking-widest transition-colors"
                  >
                    Remove
                  </button>
                )}
              </div>
              <div className={`grid gap-2 ${compact ? 'grid-cols-1' : 'sm:grid-cols-3'}`}>
                <input
                  type="text"
                  value={c.name}
                  onChange={(e) => setContact(idx, 'name', e.target.value)}
                  placeholder="Full name"
                  className={inputCls}
                />
                <input
                  type="text"
                  value={c.relationship}
                  onChange={(e) => setContact(idx, 'relationship', e.target.value)}
                  placeholder="Relationship"
                  className={inputCls}
                />
                <input
                  type="tel"
                  value={c.phone}
                  onChange={(e) => setContact(idx, 'phone', e.target.value)}
                  placeholder="Phone number"
                  className={inputCls}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Submit */}
      <div className="pt-2">
        <button
          type="submit"
          disabled={saving}
          className="w-full py-3 px-6 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white text-xs font-bold uppercase tracking-[0.12em] rounded-xl transition-all hover:shadow-lg hover:shadow-red-600/20 hover:-translate-y-px active:translate-y-0"
        >
          {saving ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              Saving…
            </span>
          ) : (
            'Save Emergency Profile'
          )}
        </button>
      </div>

    </form>
  );
};

export default EmergencyProfileForm;