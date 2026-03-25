/**
 * Closeout — sign-off, final validation, audit/history (secondary).
 * Lifecycle transitions live on Overview (JobStateTransitioner).
 */
import React from 'react';
import { useQueryClient } from '@tanstack/react-query';
import AuditTab from './AuditTab';
import SignoffCapture from '@/components/field/SignoffCapture';
import { cn } from '@/lib/utils';
import { FIELD_CARD, FIELD_OVERLINE, FIELD_SURFACE_MUTED } from '@/lib/fieldVisualTokens';

export default function JobCloseoutSection({
  job,
  auditLogs,
  onRefresh,
}) {
  const qc = useQueryClient();

  const showSignoff = job.status === 'pending_closeout' && !job.signoff_signature_url;

  return (
    <div className="space-y-6">
      <div>
        <p className={cn(FIELD_OVERLINE, 'mb-1')}>
          Closeout
        </p>
        <p className="text-xs text-slate-600 leading-snug">
          Use Overview to move the job into closeout when work is complete. Here: sign-off, then activity
          for reference.
        </p>
      </div>

      {showSignoff && (
        <div className={cn(FIELD_CARD, 'p-4')}>
          <SignoffCapture
            job={job}
            onComplete={() => {
              qc.invalidateQueries({ queryKey: ['fj-job', job.id] });
              onRefresh?.();
            }}
          />
        </div>
      )}

      {job.status === 'pending_closeout' && job.signoff_signature_url && (
        <p className="text-xs text-emerald-700 font-semibold bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-2">
          Sign-off is on file for this job.
        </p>
      )}

      <div className="pt-4 mt-2 border-t border-slate-200/90">
        <div className={cn(FIELD_SURFACE_MUTED, 'p-3')}>
          <p className={cn(FIELD_OVERLINE, 'mb-2')}>
            Activity on this job
          </p>
          <p className="text-[11px] text-slate-500 mb-3">
            Audit events and system actions (when synced from the server).
          </p>
          <AuditTab auditLogs={auditLogs} />
        </div>
      </div>
    </div>
  );
}
