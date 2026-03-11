import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import EvidenceCapture from './EvidenceCapture';
import EvidenceGallery from './EvidenceGallery';
import { Camera, ChevronDown, ChevronRight, CheckCircle2, Circle } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function EvidenceTab({ job }) {
  const [activeType, setActiveType] = useState(null);
  const [showCapture, setShowCapture] = useState(false);

  const { data: evidence = [] } = useQuery({
    queryKey: ['evidence', job?.id],
    queryFn: () => base44.entities.Evidence.filter({ job_id: job?.id }),
    enabled: !!job?.id,
  });

  const requirements = job?.evidence_requirements || [];
  const allTypes = [...new Set([
    ...requirements.map(r => r.type),
    ...evidence.map(e => e.evidence_type),
  ])];

  return (
    <div className="space-y-4">
      {requirements.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-100 p-4">
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-3">Requirements</p>
          <div className="space-y-2">
            {requirements.map((req, i) => {
              const count = evidence.filter(e => e.evidence_type === req.type && e.status === 'uploaded').length;
              const met = count >= (req.min_count || 1);
              return (
                <button
                  key={i}
                  onClick={() => { setActiveType(req.type); setShowCapture(!met); }}
                  className={cn(
                    'w-full flex items-center gap-3 p-2.5 rounded-xl transition-all text-left',
                    activeType === req.type ? 'bg-slate-50' : 'hover:bg-slate-50'
                  )}
                >
                  {met ? (
                    <CheckCircle2 className="h-5 w-5 text-emerald-500 flex-shrink-0" />
                  ) : (
                    <Circle className="h-5 w-5 text-slate-300 flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 capitalize">
                      {req.label || req.type?.replace(/_/g, ' ')}
                    </p>
                    <p className="text-xs text-slate-400">{count}/{req.min_count || 1} captured</p>
                  </div>
                  {activeType === req.type ? <ChevronDown className="h-4 w-4 text-slate-400" /> : <ChevronRight className="h-4 w-4 text-slate-400" />}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {activeType && (
        <div className="bg-white rounded-2xl border border-slate-100 p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold text-slate-900 capitalize">{activeType.replace(/_/g, ' ')}</p>
            <button
              onClick={() => setShowCapture(!showCapture)}
              className="text-xs text-blue-600 font-medium flex items-center gap-1"
            >
              <Camera className="h-3.5 w-3.5" />
              {showCapture ? 'Hide' : 'Add'}
            </button>
          </div>
          
          {showCapture && (
            <div className="mb-4">
              <EvidenceCapture
                jobId={job.id}
                evidenceType={activeType}
                onCaptured={() => setShowCapture(false)}
              />
            </div>
          )}

          <EvidenceGallery
            items={evidence.filter(e => e.evidence_type === activeType)}
            jobId={job.id}
          />
        </div>
      )}

      {!activeType && (
        <div className="bg-white rounded-2xl border border-slate-100 p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold text-slate-900">All Evidence</p>
            <button
              onClick={() => setShowCapture(!showCapture)}
              className="text-xs text-blue-600 font-medium flex items-center gap-1"
            >
              <Camera className="h-3.5 w-3.5" />
              Capture
            </button>
          </div>

          {showCapture && (
            <div className="mb-4">
              <EvidenceCapture
                jobId={job.id}
                evidenceType="general"
                onCaptured={() => setShowCapture(false)}
              />
            </div>
          )}

          <EvidenceGallery items={evidence} jobId={job.id} />
        </div>
      )}
    </div>
  );
}