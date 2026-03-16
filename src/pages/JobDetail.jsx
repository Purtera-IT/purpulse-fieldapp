import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { StatusBadge, SyncBadge } from '../components/field/StatusBadge';
import TimerPanel from '../components/field/TimerPanel';
import QuickActionsBar from '../components/field/QuickActionsBar';
import EvidenceScroller from '../components/field/EvidenceScroller';
import RunbookView from '../components/field/RunbookView';
import EvidenceTab from '../components/field/EvidenceTab';
import FieldsTab from '../components/field/FieldsTab';
import ChatView from '../components/field/ChatView';
import EvidenceCapture from '../components/field/EvidenceCapture';
import { ArrowLeft, Loader2, MapPin, Clock, Phone, Navigation } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { toast } from 'sonner';

const DETAIL_TABS = [
  { id: 'runbook',  label: 'Runbook'  },
  { id: 'evidence', label: 'Evidence' },
  { id: 'fields',   label: 'Fields'   },
  { id: 'chat',     label: 'Chat'     },
];

const ACTIVE_STATUSES = ['en_route','checked_in','in_progress','paused'];

export default function JobDetail() {
  const [activeTab, setActiveTab]     = useState('runbook');
  const [showCapture, setShowCapture] = useState(false);

  const urlParams = new URLSearchParams(window.location.search);
  const jobId = urlParams.get('id');

  const { data: job, isLoading } = useQuery({
    queryKey: ['job', jobId],
    queryFn: async () => {
      const jobs = await base44.entities.Job.filter({ id: jobId });
      return jobs[0];
    },
    enabled: !!jobId,
    refetchInterval: 15000,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
      </div>
    );
  }

  if (!job) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 px-4">
        <p className="text-slate-500">Job not found</p>
        <Link to={createPageUrl('Jobs')} className="text-blue-600 text-sm mt-2">Back to Jobs</Link>
      </div>
    );
  }

  const isActive   = ACTIVE_STATUSES.includes(job.status);
  const isReadOnly = ['submitted', 'approved'].includes(job.status);

  const statusLabel = {
    en_route:   'En Route',
    checked_in: 'Checked In',
    in_progress:'In Progress',
    paused:     'Paused',
  }[job.status];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">

      {/* ── Sticky Header ──────────────────────────────────── */}
      <div className="sticky top-0 z-20 bg-white/90 backdrop-blur-xl border-b border-slate-100">
        <div className="max-w-lg mx-auto px-4 py-3">
          <div className="flex items-center gap-3">
            <Link
              to={createPageUrl('Jobs')}
              className="h-9 w-9 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0"
              aria-label="Back to jobs list"
            >
              <ArrowLeft className="h-4 w-4 text-slate-600" />
            </Link>
            <div className="flex-1 min-w-0">
              <h1
                className="text-base font-bold text-slate-900 leading-snug"
                style={{ display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden' }}
              >
                {job.title}
              </h1>
              <div className="flex items-center gap-2 mt-0.5">
                <StatusBadge status={job.status} />
                <SyncBadge status={job.sync_status} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Scrollable Body ────────────────────────────────── */}
      <div className="flex-1 max-w-lg mx-auto w-full px-4 py-4 space-y-3 pb-10">

        {isReadOnly && (
          <div className="p-3 bg-blue-50 rounded-xl text-xs text-blue-700 font-medium text-center">
            This job has been submitted and is read-only
          </div>
        )}

        {/* ── Job meta card ───────────────────────── */}
        <div className="bg-white rounded-2xl border border-slate-100 p-4 space-y-2.5">
          {job.site_address && (
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-2 flex-1 min-w-0">
                <MapPin className="h-4 w-4 text-slate-400 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-slate-700 leading-snug">{job.site_address}</p>
              </div>
              <a
                href={`https://maps.google.com/maps?q=${encodeURIComponent(job.site_address)}`}
                target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1 h-9 px-3 rounded-xl bg-blue-600 text-white text-xs font-bold flex-shrink-0 active:opacity-80"
                aria-label="Open in maps"
              >
                <Navigation className="h-3.5 w-3.5" /> Maps
              </a>
            </div>
          )}

          {job.scheduled_date && (
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-slate-400 flex-shrink-0" />
              <p className="text-sm text-slate-600">
                {format(new Date(job.scheduled_date), 'EEE, MMM d')}
                {job.scheduled_time && ` · ETA ${job.scheduled_time}`}
              </p>
            </div>
          )}

          {job.contact_phone && (
            <a href={`tel:${job.contact_phone}`} className="flex items-center gap-2 group">
              <Phone className="h-4 w-4 text-slate-400 flex-shrink-0" />
              <p className="text-sm text-blue-600 group-active:underline">{job.contact_name} · {job.contact_phone}</p>
            </a>
          )}
        </div>

        {/* ── Timer Panel — only for active jobs ─────────── */}
        {isActive && !isReadOnly && (
          <TimerPanel jobId={job.id} statusLabel={statusLabel} />
        )}

        {/* ── Quick Actions ───────────────────────────────── */}
        {!isReadOnly && (
          <QuickActionsBar job={job} />
        )}

        {/* ── Evidence Scroller ───────────────────────────── */}
        <EvidenceScroller job={job} onAddPhoto={() => setShowCapture(true)} />

        {/* ── Detail Tabs ─────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
          {/* Tab row */}
          <div className="flex border-b border-slate-100 px-1 pt-1">
            {DETAIL_TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'flex-1 py-2.5 text-xs font-semibold transition-all rounded-t-lg',
                  activeTab === tab.id
                    ? 'text-slate-900 border-b-2 border-slate-900'
                    : 'text-slate-400'
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="p-4">
            {activeTab === 'runbook'  && <RunbookView job={job} />}
            {activeTab === 'evidence' && <EvidenceTab job={job} />}
            {activeTab === 'fields'   && <FieldsTab   job={job} />}
            {activeTab === 'chat'     && (
              <div style={{ height: 380 }}>
                <ChatView jobId={job.id} />
              </div>
            )}
          </div>
        </div>

      </div>

      {/* ── Quick Photo Sheet (from Evidence Scroller Add) ─── */}
      <Sheet open={showCapture} onOpenChange={v => !v && setShowCapture(false)}>
        <SheetContent side="bottom" className="rounded-t-3xl pb-10 max-h-[80vh] overflow-y-auto">
          <div className="pt-2">
            <div className="w-10 h-1 bg-slate-200 rounded-full mx-auto mb-5" />
            <h3 className="text-base font-bold text-slate-900 mb-4 px-1">Capture Evidence</h3>
            <EvidenceCapture
              jobId={job.id}
              evidenceType="site_photo"
              onCaptured={() => { setShowCapture(false); toast.success('Evidence captured'); }}
            />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}