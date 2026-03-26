/**
 * Coarse readiness summary for canonical FieldJobDetail Overview.
 * Derived only from job.status + whether any work_start TimeEntry exists — no fake persisted flags.
 */
import type { Job } from '@/api/types'

export type ReadinessPhaseState = 'complete' | 'current' | 'upcoming'

export interface ReadinessPhaseRow {
  id: 'route' | 'start_work' | 'work_timer'
  title: string
  detail: string
  state: ReadinessPhaseState
}

export interface FieldReadinessSummary {
  headline: string
  disclaimer: string
  phases: ReadinessPhaseRow[]
}

/**
 * Short next-step lines for the job header — same operator tone as Overview readiness (avoid copy drift).
 * Does not replace status-specific logic in `getNextStepMessage` for in_progress and later.
 */
/** Same strings for Overview headline and `getNextStepMessage` where both apply — one story on the page. */
export const READINESS_SHORT_LINES = {
  assigned:
    'Review site and dispatch details. Start route captures your ETA commitment and travel start, then you are en route.',
  en_route:
    'On site? Record check-in next, then Start work (tool/pre-start checklist), then the work timer when you bill — travel and work time stay separate.',
  checked_in:
    'On site and checked in. Start work runs the pre-start checklist; the work timer is for billable work only (not travel).',
  paused:
    'Resume in job state when ready — the pre-start checklist does not run again. Start the timer when you bill time.',
} as const

function routePhaseComplete(status: Job['status']): boolean {
  return status !== 'assigned'
}

function startWorkPhaseComplete(status: Job['status']): boolean {
  return (
    status === 'in_progress' ||
    status === 'paused' ||
    status === 'pending_closeout' ||
    status === 'submitted' ||
    status === 'approved' ||
    status === 'rejected'
  )
}

function timerPhaseComplete(hasWorkStartTimeEntry: boolean): boolean {
  return hasWorkStartTimeEntry
}

function assignPhaseStates(
  routeDone: boolean,
  startDone: boolean,
  timerDone: boolean
): { route: ReadinessPhaseState; start_work: ReadinessPhaseState; work_timer: ReadinessPhaseState } {
  const phases = [
    { id: 'route' as const, done: routeDone },
    { id: 'start_work' as const, done: startDone },
    { id: 'work_timer' as const, done: timerDone },
  ]
  let seenCurrent = false
  const out: Record<string, ReadinessPhaseState> = {}
  for (const p of phases) {
    if (p.done) {
      out[p.id] = 'complete'
    } else if (!seenCurrent) {
      out[p.id] = 'current'
      seenCurrent = true
    } else {
      out[p.id] = 'upcoming'
    }
  }
  return {
    route: out.route,
    start_work: out.start_work,
    work_timer: out.work_timer,
  }
}

function headlineForStatus(job: Job, hasWorkStartTimeEntry: boolean): string {
  const s = job.status
  if (s === 'assigned') {
    return READINESS_SHORT_LINES.assigned
  }
  if (s === 'en_route') {
    return READINESS_SHORT_LINES.en_route
  }
  if (s === 'checked_in') {
    return READINESS_SHORT_LINES.checked_in
  }
  if (s === 'paused') {
    return READINESS_SHORT_LINES.paused
  }
  if (s === 'in_progress' && !hasWorkStartTimeEntry) {
    return 'Start the work timer when you begin billable work — a short site readiness check appears first.'
  }
  if (s === 'in_progress') {
    return 'Work in progress. Keep runbook and evidence up to date.'
  }
  if (s === 'pending_closeout' || s === 'submitted' || s === 'approved' || s === 'rejected') {
    return 'Readiness steps for starting work are behind you for this job.'
  }
  return 'Follow job state and timer as you work this order.'
}

const DISCLAIMER =
  'From job status and time entries in this app — not a stored readiness record on the server.'

export function buildFieldReadinessSummary(
  job: Job,
  options: { hasWorkStartTimeEntry: boolean }
): FieldReadinessSummary {
  const { hasWorkStartTimeEntry } = options
  const routeDone = routePhaseComplete(job.status)
  const startDone = startWorkPhaseComplete(job.status)
  const timerDone = timerPhaseComplete(hasWorkStartTimeEntry)
  const states = assignPhaseStates(routeDone, startDone, timerDone)

  const routeDetail = (() => {
    if (states.route === 'complete') {
      return 'Past assigned: ETA acknowledgement and travel start were captured when you went en route (dispatch + travel facts in this app).'
    }
    if (states.route === 'current') {
      return 'Next: Job state → Start route — short sheet commits ETA and records travel start before en route.'
    }
    return 'Upcoming: Start route when you head out; ETA sheet ties commitment to travel start.'
  })()

  const startDetail = (() => {
    if (job.status === 'paused' && states.start_work === 'complete') {
      return 'Pre-start checklist already done; resume does not repeat it — use Resume in job state.'
    }
    if (states.start_work === 'complete') {
      return 'Past on-site check-in and pre-start checklist (in progress in this app).'
    }
    if (states.start_work === 'current') {
      if (job.status === 'en_route') {
        return 'Next: check in on site (short confirmation), then Job state → Start work for the pre-start checklist.'
      }
      return 'Next: Job state → Start work; short checklist before in progress.'
    }
    return 'Upcoming: after check-in, Start work moves you to in progress.'
  })()

  const timerDetail = (() => {
    if (states.work_timer === 'complete') {
      return 'At least one timer segment started here; scope sheet still runs each time you start the timer.'
    }
    if (states.work_timer === 'current') {
      return 'Next: Start timer → short site check, then time logs.'
    }
    return 'Upcoming: start timer when you bill work.'
  })()

  return {
    headline: headlineForStatus(job, hasWorkStartTimeEntry),
    disclaimer: DISCLAIMER,
    phases: [
      { id: 'route', title: 'Route', detail: routeDetail, state: states.route },
      { id: 'start_work', title: 'Start work', detail: startDetail, state: states.start_work },
      { id: 'work_timer', title: 'Work timer', detail: timerDetail, state: states.work_timer },
    ],
  }
}
