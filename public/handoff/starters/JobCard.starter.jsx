/**
 * JobCard — Starter / Reference Implementation
 * ─────────────────────────────────────────────
 * Copy this file into your project and adjust imports.
 * All CSS values reference design-tokens.json variables.
 *
 * Usage:
 *   <JobCard job={job} onStartTimer={fn} isStarting={false} />
 */

import React, { useRef, useState } from 'react';
import { MapPin, Clock, Phone, Play, Navigation } from 'lucide-react';

// ── CSS Variables (inject in :root or app shell) ────────────────────
// See design-tokens.json for full list.
// --color-primary: #0f172a
// --color-surface: #ffffff
// --color-border: #f1f5f9
// --color-text-primary: #0f172a
// --color-text-muted: #94a3b8
// --color-status-active: #10b981
// --color-status-paused: #f59e0b
// --color-status-urgent: #dc2626
// --radius-xl: 20px
// --shadow-card: 0 2px 12px rgba(0,0,0,0.06)
// --touch-target-min: 44px

const STATUS_CONFIG = {
  assigned:         { label: 'Assigned',         bg: '#f1f5f9', text: '#475569' },
  en_route:         { label: 'En Route',          bg: '#eff6ff', text: '#1d4ed8' },
  checked_in:       { label: 'Checked In',        bg: '#ecfdf5', text: '#047857' },
  in_progress:      { label: 'In Progress',       bg: '#ecfdf5', text: '#047857' },
  paused:           { label: 'Paused',            bg: '#fffbeb', text: '#b45309' },
  pending_closeout: { label: 'Pending Closeout',  bg: '#f5f3ff', text: '#6d28d9' },
  submitted:        { label: 'Submitted',         bg: '#eff6ff', text: '#1d4ed8' },
  approved:         { label: 'Approved',          bg: '#ecfdf5', text: '#047857' },
  rejected:         { label: 'Rejected',          bg: '#fef2f2', text: '#b91c1c' },
};

const ACTIVE_STATUSES = ['en_route', 'checked_in', 'in_progress', 'paused'];
const SWIPE_THRESHOLD = 60;

export default function JobCard({ job, onStartTimer, isStarting = false }) {
  const [dragX, setDragX] = useState(0);
  const startX = useRef(null);
  const cfg = STATUS_CONFIG[job.status] ?? STATUS_CONFIG.assigned;
  const isActive = ACTIVE_STATUSES.includes(job.status);
  const isUrgent = job.priority === 'urgent';

  // ── Swipe gesture ────────────────────────────────────────────────
  const onTouchStart = (e) => { startX.current = e.touches[0].clientX; };
  const onTouchMove = (e) => {
    if (startX.current === null) return;
    const dx = e.touches[0].clientX - startX.current;
    setDragX(Math.max(-100, Math.min(100, dx)));
  };
  const onTouchEnd = () => {
    if (dragX < -SWIPE_THRESHOLD) {
      // Left swipe: maps/call revealed — handled by opacity reveal
    } else if (dragX > SWIPE_THRESHOLD && !isActive) {
      onStartTimer(job);
    }
    setDragX(0);
    startX.current = null;
  };

  // ── Keyboard ─────────────────────────────────────────────────────
  const onKeyDown = (e) => {
    if (e.key === 'Enter') window.location.href = `/JobDetail?id=${job.id}`;
    if (e.key === 'Enter' && e.shiftKey && !isActive) onStartTimer(job);
  };

  return (
    <div
      role="article"
      aria-label={`${job.title}, status: ${cfg.label}${isUrgent ? ', urgent priority' : ''}`}
      tabIndex={0}
      onKeyDown={onKeyDown}
      style={{
        position: 'relative',
        borderRadius: 'var(--radius-xl, 20px)',
        overflow: 'hidden',
        boxShadow: isUrgent ? '0 0 0 2px #dc2626, var(--shadow-card)' : 'var(--shadow-card)',
        cursor: 'pointer',
        userSelect: 'none',
        outline: 'none',
      }}
    >
      {/* Behind-card actions revealed by swipe */}
      <div style={{ position: 'absolute', inset: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 16px', pointerEvents: dragX !== 0 ? 'auto' : 'none' }}>
        {/* Right side — Maps, Call */}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, opacity: Math.max(0, -dragX / SWIPE_THRESHOLD) }}>
          {job.site_address && (
            <a href={`https://maps.google.com/?q=${encodeURIComponent(job.site_address)}`} target="_blank" rel="noopener noreferrer"
               aria-label="Open in Maps" onClick={e => e.stopPropagation()}
               style={pillStyle('#2563eb', '#fff')}>
              <Navigation size={14} /> Maps
            </a>
          )}
          {job.contact_phone && (
            <a href={`tel:${job.contact_phone}`} aria-label={`Call ${job.contact_name}`}
               onClick={e => e.stopPropagation()} style={pillStyle('#059669', '#fff')}>
              <Phone size={14} /> Call
            </a>
          )}
        </div>
      </div>

      {/* Main card surface */}
      <div
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onClick={() => { window.location.href = `/JobDetail?id=${job.id}`; }}
        style={{
          background: 'var(--color-surface, #fff)',
          padding: '14px 16px',
          transform: `translateX(${dragX * 0.6}px)`,
          transition: dragX === 0 ? 'transform 0.2s ease' : 'none',
          borderRadius: 'var(--radius-xl, 20px)',
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          minHeight: 'var(--touch-target-min, 44px)',
        }}
      >
        {/* Header row */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-text-primary, #0f172a)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {job.title}
            </p>
            {job.project_name && (
              <p style={{ fontSize: 11, color: 'var(--color-text-muted, #94a3b8)', margin: '2px 0 0' }}>{job.project_name}</p>
            )}
          </div>
          <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 9999, background: cfg.bg, color: cfg.text, flexShrink: 0, whiteSpace: 'nowrap' }}>
            {cfg.label}
          </span>
        </div>

        {/* Meta row */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 12px' }}>
          {job.site_address && (
            <span style={metaStyle}><MapPin size={12} />{job.site_address}</span>
          )}
          {job.scheduled_date && (
            <span style={metaStyle}><Clock size={12} />{job.scheduled_date}{job.scheduled_time ? ` · ${job.scheduled_time}` : ''}</span>
          )}
        </div>

        {/* CTA row */}
        {!isActive && job.status !== 'pending_closeout' && (
          <button
            aria-label={`Start timer for ${job.title}`}
            disabled={isStarting}
            onClick={e => { e.stopPropagation(); onStartTimer(job); }}
            style={{
              height: 40,
              borderRadius: 12,
              background: '#0f172a',
              color: '#fff',
              border: 'none',
              fontWeight: 700,
              fontSize: 13,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              cursor: 'pointer',
              opacity: isStarting ? 0.6 : 1,
              minHeight: 'var(--touch-target-min, 44px)',
            }}
          >
            <Play size={14} aria-hidden="true" />
            {isStarting ? 'Starting…' : 'Start'}
          </button>
        )}
      </div>
    </div>
  );
}

const pillStyle = (bg, color) => ({
  display: 'flex', alignItems: 'center', gap: 4,
  height: 36, padding: '0 14px', borderRadius: 10,
  background: bg, color, fontWeight: 700, fontSize: 12,
  textDecoration: 'none',
  minHeight: 'var(--touch-target-min, 44px)',
});
const metaStyle = {
  display: 'flex', alignItems: 'center', gap: 4,
  fontSize: 11, color: 'var(--color-text-muted, #94a3b8)',
};
