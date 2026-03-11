import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Circle, AlertTriangle, Loader2, Send, FileCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export default function CloseoutPreview({ job }) {
  const queryClient = useQueryClient();

  const { data: evidence = [] } = useQuery({
    queryKey: ['evidence', job?.id],
    queryFn: () => base44.entities.Evidence.filter({ job_id: job?.id }),
    enabled: !!job?.id,
  });

  const requirements = job?.evidence_requirements || [];
  const fields = job?.fields_schema || [];
  const phases = job?.runbook_phases || [];

  const evidenceChecks = requirements.map(req => {
    const matchingEvidence = evidence.filter(e => e.evidence_type === req.type && e.status === 'uploaded');
    return {
      label: req.label || req.type,
      required: req.min_count || 1,
      captured: matchingEvidence.length,
      met: matchingEvidence.length >= (req.min_count || 1),
    };
  });

  const fieldChecks = fields.filter(f => f.required).map(f => ({
    label: f.label || f.key,
    met: !!f.value && f.value.trim() !== '',
  }));

  const allSteps = phases.flatMap(p => p.steps || []);
  const completedSteps = allSteps.filter(s => s.completed).length;
  const runbookComplete = allSteps.length === 0 || completedSteps === allSteps.length;

  const hasSignoff = !!job?.signoff_signer_name && !!job?.signoff_signature_url;

  const allEvidenceMet = evidenceChecks.every(c => c.met);
  const allFieldsMet = fieldChecks.every(c => c.met);
  const canSubmit = allEvidenceMet && allFieldsMet && runbookComplete && hasSignoff;

  const submitMutation = useMutation({
    mutationFn: async () => {
      await base44.entities.Job.update(job.id, {
        status: 'submitted',
        closeout_submitted_at: new Date().toISOString(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      toast.success('Closeout submitted successfully');
    },
  });

  const CheckItem = ({ label, met, detail }) => (
    <div className="flex items-center gap-3 py-2">
      {met ? (
        <CheckCircle2 className="h-4.5 w-4.5 text-emerald-500 flex-shrink-0" />
      ) : (
        <Circle className="h-4.5 w-4.5 text-slate-300 flex-shrink-0" />
      )}
      <div className="flex-1">
        <p className={cn('text-sm', met ? 'text-slate-600' : 'text-slate-900 font-medium')}>{label}</p>
        {detail && <p className="text-xs text-slate-400">{detail}</p>}
      </div>
    </div>
  );

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2 mb-2">
        <div className="h-8 w-8 rounded-full bg-purple-50 flex items-center justify-center">
          <FileCheck className="h-4 w-4 text-purple-600" />
        </div>
        <h3 className="font-semibold text-slate-900">Closeout Checklist</h3>
      </div>

      {!canSubmit && (
        <div className="flex items-start gap-2 p-3 bg-amber-50 rounded-xl text-xs text-amber-700">
          <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
          <span>Complete all items below before submitting the closeout package.</span>
        </div>
      )}

      <div>
        <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">Evidence</p>
        {evidenceChecks.length > 0 ? (
          <div className="divide-y divide-slate-50">
            {evidenceChecks.map((c, i) => (
              <CheckItem key={i} label={c.label} met={c.met} detail={`${c.captured}/${c.required} captured`} />
            ))}
          </div>
        ) : (
          <p className="text-xs text-slate-400 py-2">No evidence requirements</p>
        )}
      </div>

      <div>
        <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">Runbook</p>
        <CheckItem
          label="All steps completed"
          met={runbookComplete}
          detail={`${completedSteps}/${allSteps.length} steps`}
        />
      </div>

      <div>
        <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">Required Fields</p>
        {fieldChecks.length > 0 ? (
          <div className="divide-y divide-slate-50">
            {fieldChecks.map((c, i) => (
              <CheckItem key={i} label={c.label} met={c.met} />
            ))}
          </div>
        ) : (
          <p className="text-xs text-slate-400 py-2">No required fields</p>
        )}
      </div>

      <div>
        <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">Sign-Off</p>
        <CheckItem label="Client signature captured" met={hasSignoff} />
      </div>

      <Button
        className={cn(
          'w-full rounded-xl h-12',
          canSubmit ? 'bg-purple-600 hover:bg-purple-700' : 'bg-slate-200 text-slate-400 cursor-not-allowed'
        )}
        disabled={!canSubmit || submitMutation.isPending}
        onClick={() => submitMutation.mutate()}
      >
        {submitMutation.isPending ? (
          <Loader2 className="h-4 w-4 animate-spin mr-2" />
        ) : (
          <Send className="h-4 w-4 mr-2" />
        )}
        Submit Closeout
      </Button>
    </div>
  );
}