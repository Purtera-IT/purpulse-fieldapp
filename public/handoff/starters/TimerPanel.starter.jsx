/**
 * TimerPanel — Starter / Reference Implementation
 * ─────────────────────────────────────────────────
 * Displays a live timer with state transitions.
 * Writes TimeEntry records using client_request_id for idempotency.
 *
 * Usage:
 *   <TimerPanel jobId="abc123" statusLabel="In Progress" />
 *
 * CSS Variables required:
 *   --color-primary, --color-surface, --radius-xl, --touch-target-min
 */

import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, Square, Coffee, Car } from 'lucide-react';

// ── Idempotency key generator ─────────────────────────────────────
function genClientEventId() {
  return `evt-${Date.now().toString(36)}-${Math.random().toString(36).substr(2, 8)}`;
}

// ── Timer state machine ────────────────────────────────────────────
const STATE_CONFIG = {
  idle:    { label: 'Not started', color: '#94a3b8', bg: '#f8fafc' },
  working: { label: 'Working',     color: '#047857', bg: '#ecfdf5' },
  paused:  { label: 'Paused',      color: '#b45309', bg: '#fffbeb' },
  break:   { label: 'On Break',    color: '#7c3aed', bg: '#f5f3ff' },
  travel:  { label: 'Travelling',  color: '#1d4ed8', bg: '#eff6ff' },
};

function deriveState(entries = []) {
  const sorted = [...entries].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  let state = 'idle';
  for (const e of sorted) {
    if (e.entry_type === 'work_start')   state = 'working';
    if (e.entry_type === 'work_stop')    state = 'idle';
    if (e.entry_type === 'break_start')  state = 'break';
    if (e.entry_type === 'break_end')    state = 'working';
    if (e.entry_type === 'travel_start') state = 'travel';
    if (e.entry_type === 'travel_end')   state = 'working';
  }
  return state;
}

function calcElapsed(entries = []) {
  let total = 0;
  let workStart = null;
  for (const e of [...entries].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))) {
    if (e.entry_type === 'work_start')  workStart = new Date(e.timestamp);
    if (e.entry_type === 'work_stop' && workStart) {
      total += (new Date(e.timestamp) - workStart) / 1000;
      workStart = null;
    }
  }
  if (workStart) total += (Date.now() - workStart) / 1000;
  return total;
}

function fmt(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return h > 0
    ? `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`
    : `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
}

export default function TimerPanel({ jobId, entries = [], onEventCreated }) {
  const timerState = deriveState(entries);
  const cfg = STATE_CONFIG[timerState];
  const [elapsed, setElapsed] = useState(() => calcElapsed(entries));
  const intervalRef = useRef(null);

  useEffect(() => {
    if (timerState === 'working') {
      intervalRef.current = setInterval(() => setElapsed(calcElapsed(entries)), 1000);
    } else {
      clearInterval(intervalRef.current);
      setElapsed(calcElapsed(entries));
    }
    return () => clearInterval(intervalRef.current);
  }, [timerState, entries]);

  const postEvent = async (eventType) => {
    const event = {
      client_event_id: genClientEventId(),
      event_type: eventType,
      job_id: jobId,
      device_ts: new Date().toISOString(),
      device_meta: { app_version: '1.0.0' },
    };
    // POST /api/v1/jobs/{jobId}/events
    // Include X-Client-Event-Id: event.client_event_id header
    console.log('[TimerPanel] POST event:', event);
    onEventCreated?.(event);
  };

  return (
    <div style={{ background: cfg.bg, borderRadius: 'var(--radius-xl, 20px)', padding: '16px', border: `1px solid ${cfg.color}33` }}>
      {/* Status + elapsed */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        aria-label={`Timer: ${cfg.label}, elapsed ${fmt(elapsed)}`}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 700, color: cfg.color }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: cfg.color, display: 'inline-block' }} aria-hidden="true" />
          {cfg.label}
        </span>
        <span style={{ fontFamily: 'monospace', fontSize: 28, fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em' }}>
          {fmt(elapsed)}
        </span>
      </div>

      {/* Action buttons */}
      <div style={{ display: 'flex', gap: 8 }}>
        {timerState === 'idle' && (
          <TimerBtn icon={Play} label="Start Work" color="#047857" bg="#dcfce7" onClick={() => postEvent('work_start')} />
        )}
        {timerState === 'working' && (
          <>
            <TimerBtn icon={Coffee} label="Break"   color="#7c3aed" bg="#f5f3ff" onClick={() => postEvent('break_start')} />
            <TimerBtn icon={Car}    label="Travel"  color="#1d4ed8" bg="#eff6ff" onClick={() => postEvent('travel_start')} />
            <TimerBtn icon={Square} label="Stop"    color="#b91c1c" bg="#fee2e2" onClick={() => postEvent('work_stop')} />
          </>
        )}
        {(timerState === 'break' || timerState === 'travel') && (
          <TimerBtn icon={Play} label="Resume" color="#047857" bg="#dcfce7" onClick={() => postEvent(timerState === 'break' ? 'break_end' : 'travel_end')} />
        )}
      </div>
    </div>
  );
}

function TimerBtn({ icon: Icon, label, color, bg, onClick }) {
  return (
    <button
      aria-label={label}
      onClick={onClick}
      style={{
        flex: 1, height: 44, borderRadius: 12, border: 'none',
        background: bg, color, fontWeight: 700, fontSize: 12,
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
        cursor: 'pointer', minHeight: 'var(--touch-target-min, 44px)',
      }}
    >
      <Icon size={15} aria-hidden="true" />
      {label}
    </button>
  );
}
