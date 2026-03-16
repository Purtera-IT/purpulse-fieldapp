/**
 * EvidenceTile — Starter / Reference Implementation
 * ───────────────────────────────────────────────────
 * Compact thumbnail with QC state overlay ring.
 * Exports: EvidenceTile (default), QcBadge, resolveState, QC_CFG
 *
 * Usage:
 *   <EvidenceTile item={evidenceRecord} onPress={setSelected} />
 *   <QcBadge state="qc_warning" />
 */

import React from 'react';
import { CheckCircle2, AlertTriangle, XCircle, Loader2, Upload, Clock } from 'lucide-react';

// ── QC state config ───────────────────────────────────────────────
export const QC_CFG = {
  qc_ok:        { label: 'QC OK',       ring: '#059669', dot: '#059669', Icon: CheckCircle2, bg: '#ecfdf5', text: '#047857' },
  qc_warning:   { label: 'Warning',     ring: '#d97706', dot: '#d97706', Icon: AlertTriangle, bg: '#fffbeb', text: '#b45309' },
  qc_failed:    { label: 'QC Failed',   ring: '#dc2626', dot: '#dc2626', Icon: XCircle,      bg: '#fef2f2', text: '#b91c1c' },
  processing:   { label: 'Processing',  ring: '#7c3aed', dot: '#7c3aed', Icon: Loader2,      bg: '#f5f3ff', text: '#6d28d9' },
  uploaded:     { label: 'Uploaded',    ring: '#2563eb', dot: '#2563eb', Icon: CheckCircle2, bg: '#eff6ff', text: '#1d4ed8' },
  uploading:    { label: 'Uploading',   ring: '#2563eb', dot: '#2563eb', Icon: Upload,       bg: '#eff6ff', text: '#1d4ed8' },
  pending_upload:{ label: 'Pending',    ring: '#94a3b8', dot: '#94a3b8', Icon: Clock,        bg: '#f1f5f9', text: '#475569' },
  error:        { label: 'Error',       ring: '#dc2626', dot: '#dc2626', Icon: XCircle,      bg: '#fef2f2', text: '#b91c1c' },
};

// ── State resolution logic ────────────────────────────────────────
export function resolveState(item) {
  if (!item) return 'pending_upload';
  if (item.status === 'uploading')      return 'uploading';
  if (item.status === 'pending_upload') return 'pending_upload';
  if (item.status === 'error')          return 'error';
  if (item.qc_status === 'failed')      return 'qc_failed';
  if (item.qc_status === 'passed') {
    if (item.quality_score != null && item.quality_score < 65) return 'qc_warning';
    if (item.face_detected && !item.face_redacted)             return 'qc_warning';
    return 'qc_ok';
  }
  if (item.status === 'uploaded') return 'processing';
  return 'pending_upload';
}

// ── EvidenceTile ──────────────────────────────────────────────────
const SIZE_MAP = {
  sm: { outer: 64,  inner: 60,  ring: 2 },
  md: { outer: 88,  inner: 84,  ring: 2 },
  lg: { outer: 112, inner: 108, ring: 3 },
};

export default function EvidenceTile({ item, onPress, size = 'md' }) {
  const state = resolveState(item);
  const cfg   = QC_CFG[state] ?? QC_CFG.pending_upload;
  const dims  = SIZE_MAP[size];
  const { Icon } = cfg;
  const isSpinning = ['uploading', 'processing'].includes(state);

  const label = `${item.evidence_type?.replace(/_/g, ' ') ?? 'Evidence'}, QC state: ${cfg.label}`;

  return (
    <div
      role="img"
      aria-label={label}
      aria-busy={isSpinning}
      onClick={() => onPress?.(item)}
      tabIndex={onPress ? 0 : -1}
      onKeyDown={e => e.key === 'Enter' && onPress?.(item)}
      style={{
        width: dims.outer, height: dims.outer,
        borderRadius: 12, flexShrink: 0,
        cursor: onPress ? 'pointer' : 'default',
        position: 'relative', display: 'inline-block',
        outline: 'none',
      }}
    >
      {/* Ring */}
      <div style={{
        position: 'absolute', inset: 0, borderRadius: 12,
        border: `${dims.ring}px solid ${cfg.ring}`,
        pointerEvents: 'none', zIndex: 2,
      }} />

      {/* Image */}
      <div style={{
        width: '100%', height: '100%', borderRadius: 12,
        overflow: 'hidden', background: '#f1f5f9',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {item.thumbnail_url || item.file_url ? (
          <img
            src={item.thumbnail_url || item.file_url}
            alt=""
            style={{
              width: '100%', height: '100%', objectFit: 'cover',
              filter: item.face_redacted ? 'blur(6px)' : 'none',
            }}
          />
        ) : (
          <span style={{ fontSize: 10, color: '#94a3b8', fontWeight: 600, textAlign: 'center', padding: 4 }}>
            {item.evidence_type?.replace(/_/g, '\n') ?? 'No image'}
          </span>
        )}
      </div>

      {/* State overlay — uploading/processing */}
      {isSpinning && (
        <div style={{
          position: 'absolute', inset: 0, borderRadius: 12,
          background: 'rgba(255,255,255,0.7)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 3,
        }}>
          <Icon size={16} style={{ color: cfg.ring, animation: 'spin 1s linear infinite' }} aria-hidden="true" />
        </div>
      )}

      {/* QC icon badge */}
      {!isSpinning && state !== 'uploaded' && (
        <div style={{
          position: 'absolute', bottom: 4, right: 4,
          background: cfg.bg, borderRadius: '50%',
          width: 18, height: 18,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 3, border: `1px solid ${cfg.ring}44`,
        }}>
          <Icon size={10} style={{ color: cfg.dot }} aria-hidden="true" />
        </div>
      )}
    </div>
  );
}

// ── QcBadge (standalone pill) ─────────────────────────────────────
export function QcBadge({ state, showTooltip = false }) {
  const cfg = QC_CFG[state] ?? QC_CFG.pending_upload;
  const { Icon } = cfg;
  return (
    <span
      title={showTooltip ? cfg.label : undefined}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 4,
        padding: '2px 8px', borderRadius: 9999,
        background: cfg.bg, color: cfg.text,
        fontSize: 11, fontWeight: 700,
      }}
    >
      <Icon size={11} aria-hidden="true" />
      {cfg.label}
    </span>
  );
}

// Add to global CSS for spinning:
// @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
