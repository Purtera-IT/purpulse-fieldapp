import { describe, it, expect } from 'vitest'
import {
  deriveTimerSessionFromTimeEntries,
  buildFieldJobExecutionView,
  formatWorkedDuration,
} from '@/lib/fieldJobExecutionModel'
import type { Job, TimeEntry } from '@/api/client'

const baseJob = {
  id: 'j1',
  title: 'T',
  status: 'in_progress' as Job['status'],
  priority: 'medium' as Job['priority'],
  approved_for_training: false,
} as Job

function te(
  entry_type: TimeEntry['entry_type'],
  timestamp: string,
  id = '1'
): TimeEntry {
  return {
    id,
    job_id: 'j1',
    entry_type,
    timestamp,
    source: 'app',
    sync_status: 'pending',
    locked: false,
    created_date: timestamp,
    updated_date: timestamp,
    created_by: 'a@b.com',
  }
}

describe('fieldJobExecutionModel', () => {
  it('deriveTimerSessionFromTimeEntries: open work segment', () => {
    const entries = [te('work_start', '2026-01-01T10:00:00.000Z')]
    const r = deriveTimerSessionFromTimeEntries(entries)
    expect(r.workSegmentOpen).toBe(true)
    expect(r.kind).toBe('working')
    expect(r.workedSeconds).toBeGreaterThanOrEqual(0)
  })

  it('deriveTimerSessionFromTimeEntries: closed pair', () => {
    const entries = [
      te('work_start', '2026-01-01T10:00:00.000Z', '1'),
      te('work_stop', '2026-01-01T11:00:00.000Z', '2'),
    ]
    const r = deriveTimerSessionFromTimeEntries(entries)
    expect(r.workSegmentOpen).toBe(false)
    expect(r.kind).toBe('idle')
    expect(r.workedSeconds).toBe(3600)
  })

  it('buildFieldJobExecutionView: gates clock by lifecycle', () => {
    const assigned = { ...baseJob, status: 'assigned' as const }
    const v = buildFieldJobExecutionView(assigned, [])
    expect(v.canClockIn).toBe(false)
    expect(v.clockInDisabledReason).toContain('Job state')
  })

  it('formatWorkedDuration', () => {
    expect(formatWorkedDuration(3661)).toBe('01:01:01')
  })
})
