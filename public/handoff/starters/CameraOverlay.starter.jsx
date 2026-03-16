/**
 * CameraOverlay — Starter / Reference Implementation
 * ────────────────────────────────────────────────────
 * Full-screen camera capture modal.
 * - Reticle guide for framing
 * - GPS location badge
 * - Tag chips
 * - Native <input capture> fallback
 *
 * Usage:
 *   <CameraOverlay
 *     jobId="abc"
 *     evidenceType="site_photo"
 *     defaultTags={['Before']}
 *     onCapture={(file, metadata) => { ... }}
 *     onClose={() => setShow(false)}
 *   />
 */

import React, { useEffect, useRef, useState } from 'react';
import { X, Camera, Images, MapPin, Tag } from 'lucide-react';

const PRESET_TAGS = ['Before', 'After', 'Equipment', 'Serial', 'Damage', 'Site'];

export default function CameraOverlay({ jobId, evidenceType = 'site_photo', defaultTags = [], onCapture, onClose, onOpenGallery }) {
  const fileInputRef = useRef(null);
  const [selectedTags, setSelectedTags] = useState(defaultTags);
  const [geoLabel, setGeoLabel] = useState('Getting location…');
  const [geoCoords, setGeoCoords] = useState(null);
  const [notes, setNotes] = useState('');

  // ── Get GPS on mount ────────────────────────────────────────────
  useEffect(() => {
    if (!navigator.geolocation) { setGeoLabel('GPS unavailable'); return; }
    navigator.geolocation.getCurrentPosition(
      pos => {
        setGeoCoords({ lat: pos.coords.latitude, lon: pos.coords.longitude });
        setGeoLabel(`${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}`);
      },
      () => setGeoLabel('Location denied')
    );
  }, []);

  // ── Trap focus ──────────────────────────────────────────────────
  const overlayRef = useRef(null);
  useEffect(() => {
    const prev = document.activeElement;
    overlayRef.current?.focus();
    return () => prev?.focus();
  }, []);

  const toggleTag = (tag) => {
    setSelectedTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);
  };

  const handleCapture = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const metadata = {
      evidence_type: evidenceType,
      tags: selectedTags,
      geo_lat: geoCoords?.lat ?? null,
      geo_lon: geoCoords?.lon ?? null,
      notes,
      captured_at: new Date().toISOString(),
    };
    // Haptic on capture (if available)
    if (navigator.vibrate) navigator.vibrate([10, 30, 60]);
    onCapture(file, metadata);
  };

  return (
    <div
      ref={overlayRef}
      role="dialog"
      aria-modal="true"
      aria-label="Capture evidence"
      tabIndex={-1}
      style={{
        position: 'fixed', inset: 0, zIndex: 999,
        background: '#000',
        display: 'flex', flexDirection: 'column',
        outline: 'none',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', paddingTop: 'calc(16px + env(safe-area-inset-top))' }}>
        <button aria-label="Close camera" onClick={onClose} style={iconBtnStyle}>
          <X size={20} color="#fff" />
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.15)', borderRadius: 20, padding: '4px 12px' }}>
          <MapPin size={12} color={geoCoords ? '#34d399' : '#f87171'} aria-hidden="true" />
          <span style={{ fontSize: 11, color: '#fff', fontWeight: 600 }}>{geoLabel}</span>
        </div>
        {onOpenGallery && (
          <button aria-label="Open gallery" onClick={onOpenGallery} style={iconBtnStyle}>
            <Images size={20} color="#fff" />
          </button>
        )}
      </div>

      {/* Reticle */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
        <div style={{ width: '72vw', maxWidth: 320, aspectRatio: '1', position: 'relative' }}>
          <Corner pos="topLeft" />
          <Corner pos="topRight" />
          <Corner pos="bottomLeft" />
          <Corner pos="bottomRight" />
          <p style={{ position: 'absolute', bottom: -28, left: 0, right: 0, textAlign: 'center', color: 'rgba(255,255,255,0.6)', fontSize: 11 }}>
            Frame the subject within the guide
          </p>
        </div>
      </div>

      {/* Tags */}
      <div style={{ padding: '0 20px 12px', display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
        {PRESET_TAGS.map(tag => (
          <button
            key={tag}
            aria-label={`${selectedTags.includes(tag) ? 'Remove' : 'Add'} tag: ${tag}`}
            aria-pressed={selectedTags.includes(tag)}
            onClick={() => toggleTag(tag)}
            style={{
              padding: '5px 14px', borderRadius: 9999, border: '1px solid',
              borderColor: selectedTags.includes(tag) ? '#34d399' : 'rgba(255,255,255,0.3)',
              background: selectedTags.includes(tag) ? 'rgba(52,211,153,0.2)' : 'transparent',
              color: selectedTags.includes(tag) ? '#34d399' : 'rgba(255,255,255,0.7)',
              fontSize: 12, fontWeight: 600, cursor: 'pointer',
              minHeight: 36,
            }}
          >
            <Tag size={10} style={{ marginRight: 4, verticalAlign: 'middle' }} aria-hidden="true" />
            {tag}
          </button>
        ))}
      </div>

      {/* Notes input */}
      <div style={{ padding: '0 20px 12px' }}>
        <input
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="Optional note…"
          aria-label="Evidence note"
          style={{
            width: '100%', height: 40, borderRadius: 10,
            background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)',
            color: '#fff', fontSize: 13, padding: '0 12px',
            outline: 'none', boxSizing: 'border-box',
          }}
        />
      </div>

      {/* Shutter */}
      <div style={{ padding: '0 20px', paddingBottom: 'calc(24px + env(safe-area-inset-bottom))', display: 'flex', justifyContent: 'center' }}>
        <button
          aria-label="Take photo"
          onClick={() => fileInputRef.current?.click()}
          style={{
            width: 72, height: 72, borderRadius: '50%',
            background: '#fff', border: '4px solid rgba(255,255,255,0.4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer',
            boxShadow: '0 0 0 2px rgba(255,255,255,0.8)',
          }}
        >
          <Camera size={28} color="#0f172a" aria-hidden="true" />
        </button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        style={{ display: 'none' }}
        onChange={handleCapture}
      />
    </div>
  );
}

function Corner({ pos }) {
  const styles = {
    topLeft:     { top: 0, left: 0, borderTop: '3px solid #fff', borderLeft: '3px solid #fff', borderTopLeftRadius: 8 },
    topRight:    { top: 0, right: 0, borderTop: '3px solid #fff', borderRight: '3px solid #fff', borderTopRightRadius: 8 },
    bottomLeft:  { bottom: 0, left: 0, borderBottom: '3px solid #fff', borderLeft: '3px solid #fff', borderBottomLeftRadius: 8 },
    bottomRight: { bottom: 0, right: 0, borderBottom: '3px solid #fff', borderRight: '3px solid #fff', borderBottomRightRadius: 8 },
  };
  return <div aria-hidden="true" style={{ position: 'absolute', width: 24, height: 24, ...styles[pos] }} />;
}

const iconBtnStyle = {
  width: 40, height: 40, borderRadius: '50%',
  background: 'rgba(255,255,255,0.15)',
  border: 'none', cursor: 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
};
