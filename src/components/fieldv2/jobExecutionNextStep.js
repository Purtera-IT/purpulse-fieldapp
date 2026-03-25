/**
 * Next-step copy for FieldJobDetail header — only from real job + evidence fields.
 */

export function getNextStepMessage(job, evidence = []) {
  if (!job?.status) return null;

  const s = job.status;
  const runbookDone =
    job.runbook_phases?.every((phase) => phase.steps?.every((step) => step.completed)) ?? false;

  if (s === 'assigned') {
    return 'Review job details, site notes, and contacts before heading out.';
  }
  if (s === 'en_route') {
    return 'Travel to site and check in when you arrive.';
  }
  if (s === 'checked_in' || s === 'paused') {
    return 'Open Runbook and execute steps in order.';
  }
  if (s === 'in_progress') {
    if (!runbookDone) {
      return 'Work through the runbook; attach evidence to steps as you go.';
    }
    const reqs = job.evidence_requirements;
    if (Array.isArray(reqs) && reqs.length > 0) {
      const allMet = reqs.every((r) => {
        const min = r.min_count || 1;
        const count = evidence.filter(
          (e) => e.evidence_type === r.type && e.status === 'uploaded'
        ).length;
        return count >= min;
      });
      if (!allMet) {
        return 'Complete required evidence types in Evidence before closeout.';
      }
    }
    return 'Work complete on site — use Closeout when ready to finish and sign off.';
  }
  if (s === 'pending_closeout') {
    if (!job.signoff_signature_url) {
      return 'Finish sign-off and validation in Closeout.';
    }
    return 'Sign-off captured — follow any remaining closeout steps.';
  }
  if (s === 'submitted' || s === 'approved') {
    return 'This job is submitted — view-only.';
  }
  if (s === 'rejected' || s === 'qc_required') {
    return 'Follow office instructions for corrections.';
  }
  return null;
}
