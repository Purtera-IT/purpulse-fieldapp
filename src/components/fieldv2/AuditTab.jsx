/**
 * AuditTab — Audit log tab
 * Read-only timeline of audit events for this job.
 */
import React from 'react';
import { format, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';

const ACTION_CFG = {
  evidence_upload:              { dot: 'bg-blue-500',    label: 'Evidence Upload'   },
  evidence_retake:              { dot: 'bg-amber-400',   label: 'Retake Requested'  },
  evidence_delete:              { dot: 'bg-red-400',     label: 'Evidence Deleted'  },
  time_start:                   { dot: 'bg-emerald-500', label: 'Work Started'      },
  time_stop:                    { dot: 'bg-red-400',     label: 'Work Stopped'      },
  time_break_start:             { dot: 'bg-amber-400',   label: 'Break Start'       },
  time_break_end:               { dot: 'bg-emerald-400', label: 'Break End'         },
  blocker_created:              { dot: 'bg-red-600',     label: 'Blocker Created'   },
  blocker_resolved:             { dot: 'bg-emerald-500', label: 'Blocker Resolved'  },
  runbook_step_complete:        { dot: 'bg-blue-400',    label: 'Step Complete'     },
  closeout_submitted:           { dot: 'bg-indigo-500',  label: 'Closeout Submitted'},
  closeout_approved:            { dot: 'bg-emerald-600', label: 'Closeout Approved' },
  closeout_rejected:            { dot: 'bg-red-600',     label: 'Closeout Rejected' },
  job_status_change:            { dot: 'bg-purple-500',  label: 'Status Change'     },
  label_applied:                { dot: 'bg-amber-500',   label: 'Label Applied'     },
  label_approved:               { dot: 'bg-emerald-500', label: 'Label Approved'    },
  label_rejected:               { dot: 'bg-red-500',     label: 'Label Rejected'    },
  meeting_created:              { dot: 'bg-cyan-500',    label: 'Meeting Created'   },
  meeting_transcript_attached:  { dot: 'bg-cyan-400',    label: 'Transcript Linked' },
  manifest_exported:            { dot: 'bg-slate-400',   label: 'Manifest Exported' },
  audit_exported:               { dot: 'bg-slate-400',   label: 'Audit Exported'    },
};

function fmtTs(ts) {
  try { return format(parseISO(ts), 'MMM d HH:mm:ss'); } catch { return ts || '—'; }
}

function ResultBadge({ result }) {
  return (
    <span className={cn('text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-wide',
      result === 'success' ? 'bg-emerald-50 text-emerald-700' :
      result === 'error'   ? 'bg-red-50 text-red-700' :
      'bg-slate-100 text-slate-500')}>
      {result}
    </span>
  );
}

export default function AuditTab({ auditLogs }) {
  const sorted = [...auditLogs].sort((a, b) => new Date(b.client_ts) - new Date(a.client_ts));

  return (
    <div className="space-y-0">
      <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
        <div className="px-4 py-2.5 border-b border-slate-50">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Audit Log ({sorted.length} events)</p>
        </div>

        {sorted.length === 0 && (
          <div className="py-12 text-center text-slate-400 text-sm">No audit events for this job.</div>
        )}

        <div className="divide-y divide-slate-50 max-h-[60vh] overflow-y-auto">
          {sorted.map(entry => {
            const cfg = ACTION_CFG[entry.action_type] || { dot: 'bg-slate-300', label: entry.action_type };
            let payload = null;
            try { payload = JSON.parse(entry.payload_summary || '{}'); } catch {}

            return (
              <div key={entry.id} className="flex items-start gap-3 px-4 py-3">
                {/* Timeline dot */}
                <div className="flex flex-col items-center gap-0 mt-1 flex-shrink-0">
                  <span className={cn('h-2 w-2 rounded-full', cfg.dot)} />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-xs font-bold text-slate-800">{cfg.label}</p>
                    <ResultBadge result={entry.result} />
                    {entry.duration_ms > 0 && (
                      <span className="text-[10px] text-slate-300 font-mono">{entry.duration_ms}ms</span>
                    )}
                  </div>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    {entry.actor_email} · {entry.actor_role}
                  </p>
                  {entry.entity_type && (
                    <p className="text-[10px] text-slate-300 font-mono mt-0.5">
                      {entry.entity_type}{entry.entity_id ? ` · ${entry.entity_id.slice(0,14)}` : ''}
                    </p>
                  )}
                  {entry.error_message && (
                    <p className="text-[11px] text-red-600 mt-0.5 bg-red-50 px-2 py-0.5 rounded">
                      {entry.error_message}
                    </p>
                  )}
                  {payload && Object.keys(payload).length > 0 && (
                    <div className="mt-1 font-mono text-[9px] text-slate-300 truncate">
                      {JSON.stringify(payload).slice(0, 80)}{JSON.stringify(payload).length > 80 ? '…' : ''}
                    </div>
                  )}
                </div>

                <span className="text-[10px] text-slate-300 font-mono flex-shrink-0">{fmtTs(entry.client_ts)}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}