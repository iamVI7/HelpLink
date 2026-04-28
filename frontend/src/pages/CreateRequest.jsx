import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useRequests } from '../context/RequestContext';
import { useAuth } from '../context/AuthContext';
import MapLocationPicker from '../components/MapLocationPicker';
import api from '../services/api';

// ── Skeleton Loader ────────────────────────────────────────────────────────────
const SkeletonBlock = ({ className = '', style = {} }) => (
  <div className={`rounded-lg ${className}`}
    style={{
      background: 'linear-gradient(90deg, #f5f5f4 25%, #ebe9e7 50%, #f5f5f4 75%)',
      backgroundSize: '400px 100%',
      animation: 'skeletonShimmer 1.4s ease-in-out infinite',
      ...style,
    }}
  />
);

const CreateRequestSkeleton = () => (
  <div className="min-h-screen pt-20 pb-12"
    style={{ fontFamily: "'DM Sans', 'Helvetica Neue', sans-serif", background: '#ffffff', position: 'relative' }}>
    <style>{`
      @keyframes skeletonShimmer {
        0%   { background-position: -400px 0; }
        100% { background-position: 400px 0; }
      }
    `}</style>
    <div aria-hidden="true" style={{
      position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0,
      backgroundImage: 'linear-gradient(rgba(0,0,0,0.018) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.018) 1px, transparent 1px)',
      backgroundSize: '48px 48px',
    }} />
    <div style={{ position: 'relative', zIndex: 1 }}>
      <section className="border-b border-stone-100 mb-10 py-12 md:py-14">
        <div className="max-w-5xl mx-auto px-6 md:px-12">
          <SkeletonBlock className="h-5 w-24 mb-6" />
          <SkeletonBlock className="h-10 w-72 mb-3" />
          <SkeletonBlock className="h-4 w-56 mb-1" />
          <SkeletonBlock className="h-4 w-44" />
        </div>
      </section>
      <div className="max-w-5xl mx-auto px-6 md:px-12">
        <div className="flex flex-col lg:flex-row bg-white border border-stone-200 rounded-xl shadow-sm overflow-hidden">
          <div className="flex-1 p-8 border-b lg:border-b-0 lg:border-r border-stone-100 space-y-6">
            <div className="flex items-center gap-3"><SkeletonBlock className="h-2.5 w-28" /><div className="flex-1 h-px bg-stone-100" /></div>
            <div className="space-y-2"><SkeletonBlock className="h-2.5 w-10" /><SkeletonBlock className="h-10 w-full" /></div>
            <div className="space-y-2"><SkeletonBlock className="h-2.5 w-20" /><SkeletonBlock className="h-36 w-full" /></div>
            <div className="space-y-2"><SkeletonBlock className="h-2.5 w-36" /><SkeletonBlock className="h-9 w-full" style={{ borderRadius: '0.5rem' }} /></div>
            <div className="space-y-2">
              <SkeletonBlock className="h-2.5 w-16" />
              <div className="flex gap-2 flex-wrap">{[64,76,56,88,52].map((w,i)=><SkeletonBlock key={i} className="h-8" style={{width:w,borderRadius:'2rem'}}/>)}</div>
            </div>
            <div className="space-y-2">
              <SkeletonBlock className="h-2.5 w-14" />
              <div className="flex gap-2 flex-wrap">{[88,96,80].map((w,i)=><SkeletonBlock key={i} className="h-8" style={{width:w,borderRadius:'2rem'}}/>)}</div>
            </div>
          </div>
          <div className="flex-1 p-8 flex flex-col gap-5">
            <div className="flex items-center gap-3"><SkeletonBlock className="h-2.5 w-16" /><div className="flex-1 h-px bg-stone-100" /></div>
            <SkeletonBlock className="h-2.5 w-28" />
            <SkeletonBlock className="h-10 w-full" />
            <SkeletonBlock className="h-3 w-32 self-center" />
            <SkeletonBlock className="w-full" style={{ height: '480px', borderRadius: '0.75rem' }} />
            <div className="flex gap-3 pt-2">
              <SkeletonBlock className="h-11 flex-1" style={{ borderRadius: '0.5rem' }} />
              <SkeletonBlock className="h-11 flex-1" style={{ borderRadius: '0.5rem' }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
);

// ── Image Upload Drop Zone ─────────────────────────────────────────────────────
const ImageUpload = ({ images, onChange, onRemove }) => {
  const [dragging, setDragging] = useState(false);

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
    if (files.length) onChange([...images, ...files]);
  };

  return (
    <div>
      <label className="flex items-center gap-3 w-full cursor-pointer transition-all duration-150"
        style={{
          border: dragging ? '1.5px dashed rgba(220,38,38,0.5)' : '1px dashed rgba(0,0,0,0.1)',
          background: dragging ? 'rgba(220,38,38,0.02)' : '#fafaf9',
          borderRadius: '0.5rem', padding: '0.6rem 0.875rem',
        }}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
      >
        <svg className="w-4 h-4 shrink-0" style={{ color: dragging ? '#dc2626' : '#c4bfbb' }}
          fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        <span className="text-xs text-stone-400">
          Drop images or{' '}<span className="font-semibold" style={{ color: '#dc2626' }}>browse</span>
          <span className="text-stone-300 ml-1">· PNG, JPG, WEBP</span>
        </span>
        <input type="file" multiple accept="image/*" className="hidden"
          onChange={(e) => onChange(Array.from(e.target.files))} />
      </label>
      {images.length > 0 && (
        <div className="flex gap-2 flex-wrap mt-2">
          {images.map((img, i) => {
            const url = URL.createObjectURL(img);
            return (
              <div key={i} className="relative group">
                <img src={url} alt={`preview-${i}`}
                  className="w-12 h-12 object-cover rounded-lg border border-stone-200"
                  onLoad={() => URL.revokeObjectURL(url)} />
                <button type="button" onClick={() => onRemove(i)}
                  className="absolute -top-1 -right-1 w-4 h-4 bg-red-600 text-white rounded-full hidden group-hover:flex items-center justify-center text-[10px] font-bold leading-none">×</button>
              </div>
            );
          })}
          <span className="text-[10px] text-stone-300 self-end pb-0.5">{images.length} file{images.length > 1 ? 's' : ''}</span>
        </div>
      )}
    </div>
  );
};

// ── Category Pills ─────────────────────────────────────────────────────────────
// ❌ REMOVED 'tools' from categories
const categoryOptions = [
  { value: 'blood',     emoji: '🩸', label: 'Blood' },
  { value: 'medical',   emoji: '🏥', label: 'Medical' },
  { value: 'emergency', emoji: '🚨', label: 'Emergency' },
  { value: 'other',     emoji: '💡', label: 'Other' },
];

const CategoryPills = ({ value, onChange }) => (
  <div className="flex gap-2 flex-wrap">
    {categoryOptions.map(({ value: v, emoji, label }) => {
      const selected = value === v;
      return (
        <button key={v} type="button" onClick={() => onChange(v)}
          className="flex items-center gap-1.5 py-1.5 px-3 rounded-full text-xs font-semibold transition-all duration-150"
          style={{
            border: selected ? '1.5px solid rgba(220,38,38,0.6)' : '1px solid rgba(0,0,0,0.1)',
            background: selected ? 'rgba(220,38,38,0.06)' : '#fff',
            color: selected ? '#dc2626' : '#57534e',
            boxShadow: selected ? '0 0 0 3px rgba(220,38,38,0.07)' : 'none',
          }}
        >
          <span>{emoji}</span><span>{label}</span>
        </button>
      );
    })}
  </div>
);

// ── Urgency Pills ──────────────────────────────────────────────────────────────
const urgencyOptions = [
  { value: 'high',   emoji: '🔴', label: 'High',   sub: 'Immediate' },
  { value: 'medium', emoji: '🟡', label: 'Medium', sub: 'Within hours' },
  { value: 'low',    emoji: '🟢', label: 'Low',    sub: 'Within day' },
];

const UrgencyPills = ({ value, onChange }) => (
  <div className="flex gap-2 flex-wrap">
    {urgencyOptions.map(({ value: v, emoji, label, sub }) => {
      const selected = value === v;
      return (
        <button key={v} type="button" onClick={() => onChange(v)}
          className="flex items-center gap-1.5 py-1.5 px-3 rounded-full text-xs font-semibold transition-all duration-150"
          style={{
            border: selected ? '1.5px solid rgba(220,38,38,0.6)' : '1px solid rgba(0,0,0,0.1)',
            background: selected ? 'rgba(220,38,38,0.06)' : '#fff',
            color: selected ? '#dc2626' : '#57534e',
            boxShadow: selected ? '0 0 0 3px rgba(220,38,38,0.07)' : 'none',
          }}
        >
          <span>{emoji}</span><span>{label}</span>
          <span className="text-[10px] font-normal" style={{ color: selected ? 'rgba(220,38,38,0.7)' : '#a8a29e' }}>· {sub}</span>
        </button>
      );
    })}
  </div>
);

// ── Main Component ─────────────────────────────────────────────────────────────
const CreateRequest = () => {
  const [pageReady,      setPageReady]      = useState(false);
  // ✅ FIX 3 — separate loading state for prefill fetch
  const [prefillLoading, setPrefillLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '', description: '', category: 'other', urgency: 'medium', address: '', location: null,
  });
  const [images,        setImages]        = useState([]);
  const [submitting,    setSubmitting]    = useState(false);
  const [locating,      setLocating]      = useState(false);
  const [detectedCoords, setDetectedCoords] = useState(null);

  // ✅ FIX 3 — detect enhance mode from URL param
  const { requestId } = useParams();
  const isEnhanceMode = !!requestId;

  const { createRequest, updateRequest } = useRequests();
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const t = setTimeout(() => setPageReady(true), 900);
    return () => clearTimeout(t);
  }, []);

  // ✅ FIX 3 — prefill form when in enhance mode, with loading guard
  useEffect(() => {
    if (!isEnhanceMode || !requestId) return;

    const prefill = async () => {
      setPrefillLoading(true);
      try {
        const res = await api.get(`/requests/${requestId}`);
        // ✅ FIX 10 — null guard
        if (!res.data) return;
        const r = res.data;
        setFormData({
          // ✅ FIX 11 — normalize all fields
          title:       r.title       || '',
          description: r.description || '',
          category:    r.category    || 'other',
          urgency:     r.urgency     || 'medium',
          address:     '',
          location:    r.location    || null,
        });
        if (r.location?.coordinates) {
          setDetectedCoords({
            lat: r.location.coordinates[1],
            lng: r.location.coordinates[0],
          });
        }
      } catch (err) {
        console.error('Failed to prefill request:', err);
      } finally {
        setPrefillLoading(false);
      }
    };

    prefill();
  }, [isEnhanceMode, requestId]);

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleLocationSelect = (location, address) => {
    setDetectedCoords(null);
    setFormData({
      ...formData,
      location: { type: 'Point', coordinates: [location.lng, location.lat] },
      address: address || formData.address,
    });
  };

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) { alert('Geolocation is not supported by your browser.'); return; }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        let address = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`);
          const data = await res.json();
          if (data.display_name) address = data.display_name;
        } catch (_) {}
        setFormData(prev => ({
          ...prev,
          location: { type: 'Point', coordinates: [lng, lat] },
          address,
        }));
        setDetectedCoords({ lat, lng });
        setLocating(false);
      },
      () => { alert('Unable to retrieve your location. Please allow location access.'); setLocating(false); },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!isEnhanceMode && !formData.location) { alert('📍 Please select a location for your request'); return; }
    if (!isEnhanceMode && !formData.title.trim()) { alert('Please enter a title'); return; }
    if (!isEnhanceMode && !formData.description.trim()) { alert('Please enter a description'); return; }

    setSubmitting(true);

    const formPayload = new FormData();

    if (isEnhanceMode) {
      // FIX 7 — only send non-empty fields in enhance mode
      if (formData.title.trim())       formPayload.append('title',       formData.title);
      if (formData.description.trim()) formPayload.append('description', formData.description);
      formPayload.append('category', formData.category);
      formPayload.append('urgency',  formData.urgency);
    } else {
      Object.keys(formData).forEach((key) => {
        if (key === 'location' && formData.location) {
          formPayload.append('location[coordinates][0]', formData.location.coordinates[0]);
          formPayload.append('location[coordinates][1]', formData.location.coordinates[1]);
        } else {
          formPayload.append(key, formData[key]);
        }
      });
    }

    images.forEach((img) => formPayload.append('images', img));

    let result;
    if (isEnhanceMode) {
      result = await updateRequest(requestId, formPayload);
      if (result.success) {
        navigate(`/my-tracking/${requestId}`);
      }
    } else {
      result = await createRequest(formPayload);
      if (result.success) {
        // ✅ EXTENDED — publicId is now returned from createRequest (stored in
        // context and localStorage by RequestContext). The redirect still uses
        // Mongo _id so all existing tracking routes continue to work.
        if (user) {
          navigate(`/my-tracking/${result.request._id}`);
        } else {
          navigate(`/tracking/${result.request._id}`);
        }
      }
    }

    setSubmitting(false);
  };

  const removeImage = (idx) => setImages(prev => prev.filter((_, i) => i !== idx));

  // ✅ FIX 3 — show skeleton while prefilling in enhance mode
  if (!pageReady || (isEnhanceMode && prefillLoading)) return <CreateRequestSkeleton />;

  return (
    <div className="min-h-screen pt-20 pb-12"
      style={{ fontFamily: "'DM Sans', 'Helvetica Neue', sans-serif", background: '#ffffff', position: 'relative' }}>
      <div aria-hidden="true" style={{
        position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0,
        backgroundImage: 'linear-gradient(rgba(0,0,0,0.018) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.018) 1px, transparent 1px)',
        backgroundSize: '48px 48px',
      }} />

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=DM+Serif+Display:ital@0;1&display=swap');
        @keyframes fadeUp { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
        @keyframes borderPulse { 0%,100%{border-color:rgba(220,38,38,0.3)} 50%{border-color:rgba(220,38,38,0.7)} }
        .fade-up   { animation: fadeUp 0.45s ease both; }
        .fade-up-1 { animation: fadeUp 0.45s 0.08s ease both; }
        .fade-up-2 { animation: fadeUp 0.45s 0.16s ease both; }
        .form-input {
          width:100%; padding:0.625rem 0.875rem;
          border:1px solid rgba(0,0,0,0.12); border-radius:0.5rem;
          background:#ffffff; color:#1a1714; font-size:0.875rem; font-family:inherit;
          transition:border-color 0.15s,box-shadow 0.15s,background 0.15s; outline:none;
        }
        .form-input::placeholder{color:#a8a29e}
        .form-input:focus{border-color:rgba(220,38,38,0.5);box-shadow:0 0 0 3px rgba(220,38,38,0.08);background:#fff}
        .field-label{display:block;font-size:0.625rem;font-weight:700;text-transform:uppercase;letter-spacing:0.16em;color:#78716c;margin-bottom:0.5rem}
        .action-btn-primary{transition:background 0.18s,box-shadow 0.18s}
        .action-btn-primary:hover:not(:disabled){background:#ef4444!important;box-shadow:0 4px 16px rgba(220,38,38,0.28)}
        .loc-btn{transition:background 0.15s,border-color 0.15s,box-shadow 0.15s}
        .loc-btn:hover:not(:disabled){background:#fff7f7!important;border-color:rgba(220,38,38,0.6)!important;box-shadow:0 2px 8px rgba(220,38,38,0.1)}
      `}</style>

      <div style={{ position: 'relative', zIndex: 1 }}>
        {/* ── HERO HEADER ── */}
        <section className="border-b border-stone-100 relative overflow-hidden mb-10" style={{ background: 'rgba(255,255,255,0.88)' }}>
          <div className="absolute pointer-events-none"
            style={{ top:-100,right:-100,width:400,height:400,background:'radial-gradient(circle, rgba(220,38,38,0.05) 0%, transparent 70%)' }} />
          <div className="relative max-w-5xl mx-auto px-6 md:px-12 py-12 md:py-14">
            <div className="fade-up flex items-center gap-3 mb-6">
              <span className="uppercase text-[10px] font-bold tracking-[0.18em] px-3 py-1"
                style={{ border:'1px solid rgba(220,38,38,0.4)', color:'#dc2626', animation:'borderPulse 2s ease-in-out infinite' }}>
                HelpLink
              </span>
              {isEnhanceMode && (
                <span className="uppercase text-[10px] font-bold tracking-[0.18em] px-3 py-1 rounded-full"
                  style={{ background:'rgba(245,158,11,0.1)', border:'1px solid rgba(245,158,11,0.4)', color:'#b45309' }}>
                  ✏️ Enhance Mode
                </span>
              )}
            </div>
            <div className="fade-up-1">
              <h1 className="leading-none mb-3"
                style={{ fontFamily:"'DM Serif Display',Georgia,serif", fontSize:'clamp(2rem,4vw,3rem)', color:'#1a1714', letterSpacing:'-0.01em' }}>
                {isEnhanceMode ? (
                  <>Add More{' '}<span style={{ color:'#dc2626', fontStyle:'italic' }}>Details.</span>
                  <span className="text-stone-400 text-base font-normal ml-2">(Optional)</span></>
                ) : (
                  <>Create a{' '}<span style={{ color:'#dc2626', fontStyle:'italic' }}>Help Request.</span></>
                )}
              </h1>
              <p className="text-sm text-stone-400 leading-relaxed max-w-sm">
                {isEnhanceMode
                  ? 'You can optionally update the title, description, category, urgency, or add more photos to your existing request.'
                  : "Fill in the details and pin your location — we'll alert nearby volunteers instantly."}
              </p>
            </div>
          </div>
        </section>

        {/* ── FORM ── */}
        <div className="max-w-5xl mx-auto px-6 md:px-12 fade-up-2">
          <form onSubmit={handleSubmit}>
            <div className="flex flex-col lg:flex-row bg-white border border-stone-200 rounded-xl shadow-sm overflow-hidden">

              {/* ── Left: Request Details ── */}
              <div className="flex-1 p-8 border-b lg:border-b-0 lg:border-r border-stone-100 space-y-6">
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-[10px] uppercase tracking-[0.18em] text-stone-400 font-bold">
                    {isEnhanceMode ? 'Update Details (Optional)' : 'Request Details'}
                  </span>
                  <div className="flex-1 h-px bg-stone-100" />
                </div>

                <div>
                  <label className="field-label">Title {!isEnhanceMode && '*'}</label>
                  <input type="text" name="title" required={!isEnhanceMode} className="form-input"
                    placeholder={isEnhanceMode ? 'Leave blank to keep current title…' : 'e.g., Need blood donor, Need medical supplies...'}
                    value={formData.title} onChange={handleChange} />
                </div>

                <div>
                  <label className="field-label">Description {!isEnhanceMode && '*'}</label>
                  <textarea name="description" required={!isEnhanceMode} rows="6" className="form-input resize-none"
                    placeholder={isEnhanceMode ? 'Leave blank to keep current description…' : 'Describe what help you need in detail...'}
                    value={formData.description} onChange={handleChange} />
                </div>

                <div>
                  <label className="field-label">{isEnhanceMode ? 'Add Photos (Optional)' : 'Upload Image (Optional)'}</label>
                  <ImageUpload images={images} onChange={setImages} onRemove={removeImage} />
                </div>

                <div>
                  <label className="field-label">Category</label>
                  <CategoryPills value={formData.category} onChange={(v) => setFormData({ ...formData, category: v })} />
                </div>

                <div>
                  <label className="field-label">Urgency</label>
                  <UrgencyPills value={formData.urgency} onChange={(v) => setFormData({ ...formData, urgency: v })} />
                </div>
              </div>

              {/* ── Right: Location + Submit ── */}
              <div className="flex-1 p-8 flex flex-col gap-5">
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-[10px] uppercase tracking-[0.18em] text-stone-400 font-bold">Location</span>
                  <div className="flex-1 h-px bg-stone-100" />
                </div>

                {isEnhanceMode ? (
                  <div className="rounded-xl px-5 py-4 text-center"
                    style={{ background:'rgba(245,158,11,0.05)', border:'1px dashed rgba(245,158,11,0.35)' }}>
                    <p className="text-[0.72rem] text-amber-700 font-medium m-0">📍 Location cannot be changed after SOS is sent.</p>
                    <p className="text-[0.65rem] text-stone-400 m-0 mt-1">Your original location is preserved and visible to responders.</p>
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col">
                    <label className="field-label">Pin Your Location *</label>
                    <button type="button" onClick={handleUseCurrentLocation} disabled={locating}
                      className="loc-btn w-full mb-3 flex items-center justify-center gap-2 py-2.5 px-4 border border-stone-200 bg-white text-stone-700 text-xs font-bold uppercase tracking-widest rounded-lg disabled:opacity-50">
                      {locating ? (
                        <><svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                        </svg>Detecting location...</>
                      ) : (
                        <><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
                        </svg>Use My Current Location</>
                      )}
                    </button>
                    <div className="relative flex items-center mb-3">
                      <div className="flex-grow border-t border-stone-100" />
                      <span className="mx-3 text-[10px] uppercase tracking-widest text-stone-400 font-bold">or pick on map</span>
                      <div className="flex-grow border-t border-stone-100" />
                    </div>
                    <MapLocationPicker onLocationSelect={handleLocationSelect} height="400px" markerPosition={detectedCoords} />
                    {formData.address && (
                      <p className="mt-3 text-xs text-green-600 flex items-start gap-1.5 font-medium">
                        <svg className="w-3.5 h-3.5 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/>
                        </svg>
                        <span>{formData.address.substring(0,100)}{formData.address.length>100?'...':''}</span>
                      </p>
                    )}
                  </div>
                )}

                <div className="flex gap-3 pt-2">
                  <button type="button"
                    onClick={() => isEnhanceMode ? navigate(`/my-tracking/${requestId}`) : navigate('/dashboard')}
                    className="flex-1 py-3 px-4 border border-stone-200 rounded-lg text-stone-600 text-xs font-bold uppercase tracking-widest hover:bg-stone-50 transition-colors">
                    {isEnhanceMode ? '← Back' : 'Cancel'}
                  </button>
                  <button type="submit" disabled={submitting}
                    className="action-btn-primary flex-1 py-3 px-4 bg-red-600 text-white text-xs font-bold uppercase tracking-widest rounded-lg disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-600">
                    {submitting ? (
                      <span className="flex items-center justify-center gap-2">
                        <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                        </svg>
                        {isEnhanceMode ? 'Updating...' : 'Creating...'}
                      </span>
                    ) : (
                      isEnhanceMode ? 'Update Details' : 'Create Request'
                    )}
                  </button>
                </div>
              </div>

            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CreateRequest;