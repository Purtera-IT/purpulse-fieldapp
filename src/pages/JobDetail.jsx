import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { StatusBadge, SyncBadge } from '../components/field/StatusBadge';
import JobOverviewTab from '../components/field/JobOverviewTab';
import RunbookView from '../components/field/RunbookView';
import EvidenceTab from '../components/field/EvidenceTab';
import FieldsTab from '../components/field/FieldsTab';
import ChatView from '../components/field/ChatView';
import BlockerForm from '../components/field/BlockerForm';
import { ArrowLeft, Loader2, AlertTriangle, MoreVertical } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'runbook', label: 'Runbook' },
  { id: 'evidence', label: 'Evidence' },
  { id: 'fields', label: 'Fields' },
  { id: 'chat', label: 'Chat' },
];

export default function JobDetail() {
  const [activeTab, setActiveTab] = useState('overview');
  const [showBlocker, setShowBlocker] = useState(false);

  const urlParams = new URLSearchParams(window.location.search);
  const jobId = urlParams.get('id');

  const { data: job, isLoading } = useQuery({
    queryKey: ['job', jobId],
    queryFn: async () => {
      const jobs = await base44.entities.Job.filter({ id: jobId });
      return jobs[0];
    },
    enabled: !!jobId,
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

  const isReadOnly = ['submitted', 'approved'].includes(job.status);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-white/80 backdrop-blur-xl border-b border-slate-100">
        <div className="max-w-lg mx-auto px-4 py-3">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <Link to={createPageUrl('Jobs')} className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center">
                <ArrowLeft className="h-4 w-4 text-slate-600" />
              </Link>
              <div className="min-w-0">
                <h1 className="text-base font-semibold text-slate-900 truncate">{job.title}</h1>
                <div className="flex items-center gap-2 mt-0.5">
                  <StatusBadge status={job.status} size="sm" />
                  <SyncBadge status={job.sync_status} />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1">
              {!isReadOnly && (
                <Sheet open={showBlocker} onOpenChange={setShowBlocker}>
                  <SheetTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-red-500">
                      <AlertTriangle className="h-4 w-4" />
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="bottom" className="rounded-t-3xl max-h-[80vh] overflow-y-auto">
                    <BlockerForm jobId={job.id} onClose={() => setShowBlocker(false)} />
                  </SheetContent>
                </Sheet>
              )}
            </div>
          </div>

          {/* Segmented tabs */}
          <div className="flex bg-slate-100 rounded-xl p-0.5 gap-0.5">
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'flex-1 py-1.5 rounded-lg text-xs font-medium transition-all',
                  activeTab === tab.id
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 max-w-lg mx-auto w-full px-4 py-4">
        {isReadOnly && (
          <div className="mb-4 p-3 bg-blue-50 rounded-xl text-xs text-blue-700 font-medium text-center">
            This job has been submitted and is read-only
          </div>
        )}

        {activeTab === 'overview' && <JobOverviewTab job={job} />}
        {activeTab === 'runbook' && <RunbookView job={job} />}
        {activeTab === 'evidence' && <EvidenceTab job={job} />}
        {activeTab === 'fields' && <FieldsTab job={job} />}
        {activeTab === 'chat' && (
          <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden" style={{ height: 'calc(100vh - 200px)' }}>
            <ChatView jobId={job.id} />
          </div>
        )}
      </div>
    </div>
  );
}