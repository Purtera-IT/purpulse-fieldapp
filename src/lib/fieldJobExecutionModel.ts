/**
 * Derived execution + work-session view for canonical FieldJobDetail.
 * Authoritative inputs: job (lifecycle) + TimeEntry[] (work timer). No mutations/telemetry here.
 */
import type { Job, TimeEntry } from '@/api/client'

/**
 * Latest TimeEntry-derived hint (TimerPanel parity). Field v2 UI must not label break/travel as
 * first-class flows until those controls exist here — use `workSegmentOpen` + `workedSeconds` only
 * for work-timer presentation.
 */
export type TimerSessionKind = 'idle' | 'working' | 'on_break' | 'traveling'

/** Lifecycle presentation shared by header, overview, and dots */
export const LIFECYCLE_DISPLAY: Record<
  Job['status'],
  { label: string; dotClass: string; pillBg: string; pillText: string }
> = {
  assigned: {
    label: 'Assigned',
    dotClass: 'bg-slate-400',
    pillBg: 'bg-slate-100',
    pillText: 'text-slate-600',
  },
  en_route: {
    label: 'En route',
    dotClass: 'bg-cyan-500',
    pillBg: 'bg-cyan-50',
    pillText: 'text-cyan-700',
  },
  checked_in: {
    label: 'Checked in',
    dotClass: 'bg-purple-500',
    pillBg: 'bg-purple-50',
    pillText: 'text-purple-700',
  },
  in_progress: {
    label: 'In progress',
    dotClass: 'bg-blue-500',
    pillBg: 'bg-blue-50',
    pillText: 'text-blue-700',
  },
  paused: {
    label: 'Paused',
    dotClass: 'bg-amber-400',
    pillBg: 'bg-amber-50',
    pillText: 'text-amber-700',
  },
  pending_closeout: {
    label: 'Ready for closeout',
    dotClass: 'bg-orange-500',
    pillBg: 'bg-orange-50',
    pillText: 'text-orange-700',
  },
  submitted: {
    label: 'Submitted',
    dotClass: 'bg-green-500',
    pillBg: 'bg-green-50',
    pillText: 'text-green-700',
  },
  approved: {
    label: 'Approved',
    dotClass: 'bg-emerald-500',
    pillBg: 'bg-emerald-50',
    pillText: 'text-emerald-700',
  },
  rejected: {
    label: 'Rejected',
    dotClass: 'bg-red-500',
    pillBg: 'bg-red-50',
    pillText: 'text-red-700',
  },
}

/** List / legacy statuses not on JobSchema union — same shape as LIFECYCLE_DISPLAY for one badge source */
export type FieldJobListStatus = Job['status'] | 'qc_required' | 'closed'

export const FIELD_JOB_STATUS_DISPLAY: Record<
  FieldJobListStatus,
  { label: string; dotClass: string; pillBg: string; pillText: string }
> = {
  ...LIFECYCLE_DISPLAY,
  qc_required: {
    label: 'QC required',
    dotClass: 'bg-amber-500',
    pillBg: 'bg-amber-50',
    pillText: 'text-amber-800',
  },
  closed: {
    label: 'Closed',
    dotClass: 'bg-slate-300',
    pillBg: 'bg-slate-100',
    pillText: 'text-slate-500',
  },
}

export function getFieldJobStatusDisplay(
  status: string
): (typeof FIELD_JOB_STATUS_DISPLAY)[FieldJobListStatus] {
  const key = status as FieldJobListStatus
  return FIELD_JOB_STATUS_DISPLAY[key] ?? FIELD_JOB_STATUS_DISPLAY.assigned
}

/**
 * Chronological work_start/work_stop → workedSeconds + workSegmentOpen (authoritative for field v2).
 * `kind` reflects latest entry type for future/other surfaces; do not map it to user-visible break/travel
 * copy in FieldJobDetail / FieldTimeTracker until those flows are supported there.
 */
export function deriveTimerSessionFromTimeEntries(entries: TimeEntry[]): {
  kind: TimerSessionKind
  sinceIso: string | null
  workedSeconds: number
  workSegmentOpen: boolean
} {
  const sortedChrono = [...entries].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  )
  let ms = 0
  let ws: Date | null = null
  for (const e of sortedChrono) {
    if (e.entry_type === 'work_start') ws = new Date(e.timestamp)
    if (e.entry_type === 'work_stop' && ws) {
      ms += new Date(e.timestamp).getTime() - ws.getTime()
      ws = null
    }
  }
  if (ws) ms += Date.now() - ws.getTime()
  const workedSeconds = Math.floor(ms / 1000)
  const workSegmentOpen = ws !== null

  if (!entries.length) {
    return { kind: 'idle', sinceIso: null, workedSeconds: 0, workSegmentOpen: false }
  }
  const latest = [...entries].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  )[0]
  /* Provisional: mirrors TimerPanel latest-entry map; not surfaced as product state in field v2 UI. */
  const map: Partial<Record<TimeEntry['entry_type'], TimerSessionKind>> = {
    work_start: 'working',
    break_start: 'on_break',
    travel_start: 'traveling',
  }
  const kind = map[latest.entry_type] ?? 'idle'
  return { kind, sinceIso: latest.timestamp, workedSeconds, workSegmentOpen }
}

export function formatWorkedDuration(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
}

export interface FieldJobExecutionView {
  lifecycle: (typeof LIFECYCLE_DISPLAY)[Job['status']]
  /** For field v2 display, use timer.workSegmentOpen + timer.workedSeconds; timer.kind is internal/provisional. */
  timer: ReturnType<typeof deriveTimerSessionFromTimeEntries>
  /** Work timer start/stop (TimeEntry work_start / work_stop) */
  canClockIn: boolean
  canClockOut: boolean
  clockInDisabledReason: string | null
  /** True when job is in progress but no open work_start — honest gap */
  inProgressWithoutOpenTimer: boolean
  sessionSummaryLine: string
}

export function buildFieldJobExecutionView(job: Job, timeEntries: TimeEntry[]): FieldJobExecutionView {
  const lifecycle = LIFECYCLE_DISPLAY[job.status] ?? LIFECYCLE_DISPLAY.assigned
  const timer = deriveTimerSessionFromTimeEntries(timeEntries)

  let clockInDisabledReason: string | null = null
  let canClockIn = false
  let canClockOut = false

  if (job.status === 'paused') {
    clockInDisabledReason = 'Job is paused — resume work in Job state before using the work timer.'
  } else if (job.status === 'assigned' || job.status === 'en_route') {
    clockInDisabledReason =
      job.status === 'assigned'
        ? 'Start route (ETA + travel) in Job state, then check in on site — the work timer is only for billable time after that.'
        : 'Check in on site in Job state first — travel is separate from the work timer.'
  } else if (
    job.status === 'pending_closeout' ||
    job.status === 'submitted' ||
    job.status === 'approved' ||
    job.status === 'rejected'
  ) {
    clockInDisabledReason = 'Work timer is not available for this job stage.'
  } else if (job.status === 'checked_in' || job.status === 'in_progress') {
    if (timer.workSegmentOpen) {
      clockInDisabledReason = 'End the current work segment before starting a new one.'
      canClockIn = false
      canClockOut = true
    } else {
      canClockIn = true
      canClockOut = false
      clockInDisabledReason = null
    }
  }

  const inProgressWithoutOpenTimer = job.status === 'in_progress' && !timer.workSegmentOpen

  let sessionSummaryLine: string
  if (job.status === 'paused') {
    sessionSummaryLine = 'Job paused — timer actions disabled until you resume.'
  } else if (timer.workSegmentOpen) {
    sessionSummaryLine = `Work timer running · ${formatWorkedDuration(timer.workedSeconds)} logged this job`
  } else if (job.status === 'in_progress' || job.status === 'checked_in') {
    sessionSummaryLine = 'No active work timer — start when you begin billable work on site.'
  } else if (job.status === 'en_route') {
    sessionSummaryLine =
      'En route — work timer stays off until you check in on site, then start work, then start the timer for billable work.'
  } else {
    sessionSummaryLine = 'Work timer unlocks after check-in and start work in Job state.'
  }

  return {
    lifecycle,
    timer,
    canClockIn,
    canClockOut,
    clockInDisabledReason,
    inProgressWithoutOpenTimer,
    sessionSummaryLine,
  }
}
