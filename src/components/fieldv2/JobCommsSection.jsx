/**
 * FieldJobDetail → Comms tab
 *
 * Three zones (fixed order):
 *  1. Job coordination — routine thread updates only (ChatView + job context).
 *  2. Escalation / blockers — persistent card + CTA → Dialog + BlockerForm (tracked record).
 *  3. Meetings & context — secondary, below thread + escalation.
 */
import React, { useState } from 'react';
import { MessageSquare, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import ChatView from '@/components/field/ChatView';
import BlockerForm from '@/components/field/BlockerForm';
import MeetingsTab from './MeetingsTab';
import {
  FIELD_CARD,
  FIELD_OVERLINE,
  FIELD_SURFACE_MUTED,
  FIELD_SURFACE_WARNING,
  FIELD_TAB_LABEL,
} from '@/lib/fieldVisualTokens';

export default function JobCommsSection(props) {
  const { job, onRefresh } = props;
  const [escalationOpen, setEscalationOpen] = useState(false);

  return (
    <div className={cn(FIELD_SURFACE_MUTED, 'px-3 py-4 sm:px-4')}>
      {/* —— Page framing —— */}
      <header className="space-y-2 px-0.5 pb-5 border-b border-slate-200/90">
        <p className={FIELD_OVERLINE}>Communication</p>
        <h2 className="text-sm font-bold text-slate-900 leading-tight">Coordination for this work order</h2>
        <p className="text-xs text-slate-600">
          <span className="font-mono font-semibold text-slate-800">{job.external_id || job.id}</span>
          {job.title ? (
            <>
              <span className="text-slate-300 mx-1.5" aria-hidden>
                ·
              </span>
              <span className="font-medium">{job.title}</span>
            </>
          ) : null}
        </p>
        <p className="text-[10px] text-slate-500 leading-snug pt-0.5">
          <span className="font-semibold text-slate-600">Three parts:</span>{' '}
          <span className="text-slate-600">① Job coordination</span>
          <span className="text-slate-300 mx-1">·</span>
          <span className="text-slate-600">② Escalation / blocker</span>
          <span className="text-slate-300 mx-1">·</span>
          <span className="text-slate-500">③ Meetings &amp; context</span>
        </p>
      </header>

      <div className="space-y-8 pt-6">
        {/* —— Zone 1: Job coordination thread (routine updates only — not blocker reporting) —— */}
        <section
          className="space-y-2"
          aria-label="Job coordination thread"
          aria-labelledby="comms-thread-heading"
        >
          <div className="flex items-center gap-2 px-0.5">
            <span
              className="flex h-5 min-w-[1.25rem] items-center justify-center rounded bg-slate-200 text-[9px] font-black text-slate-700"
              aria-hidden
            >
              1
            </span>
            <MessageSquare className="h-3.5 w-3.5 text-slate-400" aria-hidden />
            <p id="comms-thread-heading" className={cn(FIELD_TAB_LABEL, 'text-slate-600 normal-case')}>
              Job coordination
            </p>
          </div>
          <p className="text-[11px] font-semibold text-slate-700 px-0.5 pl-7">Routine updates only</p>
          <p className="text-[11px] text-slate-500 leading-snug px-0.5 pl-7">
            Post short status notes, handoffs, and on-site coordination for <strong className="font-semibold text-slate-600">this job</strong>. Do{' '}
            <strong className="font-semibold text-slate-700">not</strong> use this thread for blockers or issues that need a{' '}
            <strong className="font-semibold text-slate-700">tracked escalation</strong>—use section ② below.
          </p>
          <div className={cn(FIELD_CARD, 'rounded-lg overflow-hidden h-[min(40vh,240px)] min-h-[168px] flex flex-col')}>
            <ChatView jobId={job.id} job={job} />
          </div>
        </section>

        {/* —— Zone 2: Escalation / blocker (always visible — Dialog is only the form) —— */}
        <section
          className={cn(FIELD_SURFACE_WARNING, 'px-4 py-4')}
          aria-label="Escalation and blockers"
          aria-labelledby="comms-escalation-heading"
        >
          <div className="flex items-start gap-3">
            <span
              className="flex h-6 min-w-[1.5rem] items-center justify-center rounded-md bg-amber-200 text-[10px] font-black text-amber-950 flex-shrink-0 mt-1"
              aria-hidden
            >
              2
            </span>
            <div className="h-10 w-10 rounded-xl bg-amber-200 flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="h-5 w-5 text-amber-900" aria-hidden />
            </div>
            <div className="min-w-0 flex-1 space-y-2.5">
              <h3 id="comms-escalation-heading" className="text-base font-bold text-amber-950 leading-snug tracking-tight">
                Escalation / blocker
              </h3>
              <p className="text-[11px] text-amber-950/90 leading-relaxed">
                Creates a <strong className="font-semibold">tracked escalation</strong> for this job. Use for blockers,
                site issues, or anything that needs <strong className="font-semibold">active follow-up</strong>—not a
                routine chat message.
              </p>
              <p className="text-[10px] text-amber-900/80 leading-snug">Saved on this job even if sync is delayed.</p>
              <Button
                type="button"
                className="w-full sm:w-auto rounded-xl bg-amber-900 hover:bg-amber-950 text-white font-semibold h-11 px-6 text-sm shadow-sm"
                onClick={() => setEscalationOpen(true)}
              >
                Report escalation
              </Button>
            </div>
          </div>
        </section>

        <Dialog open={escalationOpen} onOpenChange={setEscalationOpen}>
          <DialogContent className="max-w-md max-h-[min(90vh,640px)] overflow-y-auto rounded-2xl">
            <DialogHeader>
              <DialogTitle className="sr-only">File escalation for this work order</DialogTitle>
            </DialogHeader>
            <BlockerForm
              variant="comms"
              jobId={job.id}
              onClose={() => setEscalationOpen(false)}
              onSubmitted={() => {
                onRefresh?.();
              }}
            />
          </DialogContent>
        </Dialog>

        {/* —— Zone 3: Meetings & context (visibly secondary) —— */}
        <section
          className={cn(FIELD_SURFACE_MUTED, 'bg-slate-100/40 px-3 py-3 space-y-2 opacity-[0.95]')}
          aria-label="Meetings and context"
          aria-labelledby="comms-meetings-heading"
        >
          <div className="flex items-center gap-2 px-0.5">
            <span
              className="flex h-5 min-w-[1.25rem] items-center justify-center rounded bg-slate-200/80 text-[9px] font-black text-slate-500"
              aria-hidden
            >
              3
            </span>
            <p
              id="comms-meetings-heading"
              className={FIELD_OVERLINE}
            >
              Meetings &amp; context
            </p>
          </div>
          <p className="text-[10px] text-slate-500 leading-snug pl-7">
            Supporting context only—below coordination and escalation.
          </p>
          <div className="rounded-lg border border-slate-200/60 bg-white/50 px-1 py-1">
            <MeetingsTab {...props} />
          </div>
        </section>
      </div>
    </div>
  );
}
