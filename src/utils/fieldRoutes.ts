/** Canonical field technician routes (Iteration 1 shell consolidation). */
export const CANONICAL_JOBS_PATH = '/FieldJobs'
export const CANONICAL_JOB_DETAIL_PATH = '/FieldJobDetail'

export function fieldJobDetailUrl(jobId: string, tab?: string | null) {
  const p = new URLSearchParams()
  p.set('id', jobId)
  if (tab) p.set('tab', tab)
  return `${CANONICAL_JOB_DETAIL_PATH}?${p.toString()}`
}

/** Legacy /JobDetail?tab=tasks maps to FieldJobDetail runbook tab */
export const FIELD_JOB_TAB_RUNBOOK = 'runbook'
