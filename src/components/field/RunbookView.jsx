import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { CheckCircle2, Circle, ChevronDown, ChevronRight, Camera, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import EvidenceCapture from './EvidenceCapture';

function StepItem({ step, jobId, evidence, onComplete }) {
  const [expanded, setExpanded] = useState(false);
  const [showCapture, setShowCapture] = useState(null);

  const requiredTypes = step.required_evidence_types || [];
  const stepEvidence = evidence?.filter(e => e.runbook_step_id === step.id && e.status !== 'replaced') || [];

  const evidenceMet = requiredTypes.every(type => {
    return stepEvidence.some(e => e.evidence_type === type);
  });

  const canComplete = requiredTypes.length === 0 || evidenceMet;

  return (
    <div className={cn(
      'border rounded-xl transition-all',
      step.completed ? 'border-emerald-200 bg-emerald-50/50' : 'border-slate-100 bg-white'
    )}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 p-3 text-left"
      >
        {step.completed ? (
          <CheckCircle2 className="h-5 w-5 text-emerald-500 flex-shrink-0" />
        ) : (
          <Circle className="h-5 w-5 text-slate-300 flex-shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          <p className={cn('text-sm font-medium', step.completed && 'text-emerald-700')}>
            {step.name}
          </p>
          {requiredTypes.length > 0 && (
            <p className="text-xs text-slate-400 mt-0.5">
              {stepEvidence.length}/{requiredTypes.length} evidence items
            </p>
          )}
        </div>
        {expanded ? <ChevronDown className="h-4 w-4 text-slate-400" /> : <ChevronRight className="h-4 w-4 text-slate-400" />}
      </button>

      {expanded && (
        <div className="px-3 pb-3 space-y-3">
          {step.description && (
            <p className="text-xs text-slate-500 pl-8">{step.description}</p>
          )}

          {requiredTypes.length > 0 && (
            <div className="pl-8 space-y-2">
              <p className="text-xs font-medium text-slate-600">Required Evidence:</p>
              {requiredTypes.map((type) => {
                const hasEvidence = stepEvidence.some(e => e.evidence_type === type);
                return (
                  <div key={type} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {hasEvidence ? (
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                      ) : (
                        <Circle className="h-3.5 w-3.5 text-slate-300" />
                      )}
                      <span className="text-xs capitalize text-slate-600">{type.replace(/_/g, ' ')}</span>
                    </div>
                    {!hasEvidence && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => setShowCapture(showCapture === type ? null : type)}
                      >
                        <Camera className="h-3 w-3 mr-1" />
                        Capture
                      </Button>
                    )}
                  </div>
                );
              })}
              {showCapture && (
                <div className="mt-2">
                  <EvidenceCapture
                    jobId={jobId}
                    evidenceType={showCapture}
                    stepId={step.id}
                    onCaptured={() => setShowCapture(null)}
                  />
                </div>
              )}
            </div>
          )}

          {!step.completed && (
            <div className="pl-8">
              <Button
                size="sm"
                className={cn(
                  'rounded-lg w-full',
                  canComplete ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-slate-300 cursor-not-allowed'
                )}
                disabled={!canComplete}
                onClick={() => onComplete(step.id)}
              >
                {canComplete ? (
                  <>
                    <CheckCircle2 className="h-4 w-4 mr-1.5" />
                    Mark Complete
                  </>
                ) : (
                  <>
                    <Lock className="h-4 w-4 mr-1.5" />
                    Evidence Required
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function RunbookView({ job }) {
  const queryClient = useQueryClient();
  const phases = job?.runbook_phases || [];

  const { data: evidence = [] } = useQuery({
    queryKey: ['evidence', job?.id],
    queryFn: () => base44.entities.Evidence.filter({ job_id: job?.id }),
    enabled: !!job?.id,
  });

  const completeStep = useMutation({
    mutationFn: async (stepId) => {
      const updatedPhases = phases.map(phase => ({
        ...phase,
        steps: phase.steps.map(step =>
          step.id === stepId ? { ...step, completed: true, completed_at: new Date().toISOString() } : step
        ),
      }));
      await base44.entities.Job.update(job.id, { runbook_phases: updatedPhases });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      toast.success('Step completed');
    },
  });

  if (!phases.length) {
    return (
      <div className="text-center py-12 text-slate-400 text-sm">
        No runbook assigned to this job
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {phases.sort((a, b) => (a.order || 0) - (b.order || 0)).map((phase) => {
        const totalSteps = phase.steps?.length || 0;
        const completedSteps = phase.steps?.filter(s => s.completed).length || 0;

        return (
          <div key={phase.id}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-slate-900">{phase.name}</h3>
              <span className="text-xs text-slate-400">{completedSteps}/{totalSteps}</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-1.5 mb-3">
              <div
                className="bg-emerald-500 h-1.5 rounded-full transition-all duration-300"
                style={{ width: `${totalSteps ? (completedSteps / totalSteps) * 100 : 0}%` }}
              />
            </div>
            <div className="space-y-2">
              {phase.steps?.sort((a, b) => (a.order || 0) - (b.order || 0)).map((step) => (
                <StepItem
                  key={step.id}
                  step={step}
                  jobId={job.id}
                  evidence={evidence}
                  onComplete={(stepId) => completeStep.mutate(stepId)}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}