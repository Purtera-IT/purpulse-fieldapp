import { describe, it, expect, vi, beforeEach } from 'vitest';

const hoisted = vi.hoisted(() => ({
  emitCloseoutEvent: vi.fn().mockResolvedValue(undefined),
  emitDispatchEventForJobStatusChange: vi.fn().mockResolvedValue(undefined),
  fetchJobContextForArtifactEvent: vi.fn().mockResolvedValue({ project_id: 'p99' }),
  jobUpdate: vi.fn().mockResolvedValue({ id: 'j1', status: 'submitted' }),
  emitCanonicalEventsForTimeEntry: vi.fn().mockResolvedValue('evt-travel'),
  emitArrivalForClockIn: vi.fn().mockResolvedValue('evt-arrival'),
  createTimeEntry: vi.fn().mockResolvedValue({ id: 'te1' }),
  getTravelStartLocationOptional: vi.fn().mockResolvedValue(null),
}));

vi.mock('@/api/base44Client', () => ({
  base44: {
    entities: {
      Job: {
        update: (...args: unknown[]) => hoisted.jobUpdate(...args),
      },
    },
  },
}));

vi.mock('@/api/client', () => ({
  apiClient: {
    createTimeEntry: hoisted.createTimeEntry,
  },
}));

vi.mock('@/lib/artifactEvent', () => ({
  fetchJobContextForArtifactEvent: hoisted.fetchJobContextForArtifactEvent,
}));

vi.mock('@/lib/closeoutEvent', () => ({
  emitCloseoutEvent: hoisted.emitCloseoutEvent,
}));

vi.mock('@/lib/dispatchEvent', () => ({
  emitDispatchEventForJobStatusChange: hoisted.emitDispatchEventForJobStatusChange,
}));

vi.mock('@/lib/travelArrivalEvent', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/travelArrivalEvent')>();
  return {
    ...actual,
    emitCanonicalEventsForTimeEntry: hoisted.emitCanonicalEventsForTimeEntry,
    emitArrivalForClockIn: hoisted.emitArrivalForClockIn,
  };
});

vi.mock('@/lib/travelGps', () => ({
  getTravelStartLocationOptional: hoisted.getTravelStartLocationOptional,
}));

import { executeJobStateTransitionMutation } from '@/lib/jobStateTransitionMutation';

const baseJob = {
  id: 'j1',
  status: 'pending_closeout',
  evidence_requirements: [],
  fields_schema: [],
  runbook_phases: [],
  signoff_signer_name: 'A',
  signoff_signature_url: 'https://sig',
};

const user = { email: 't@x.com', id: 'u1' };

describe('executeJobStateTransitionMutation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    hoisted.emitCloseoutEvent.mockResolvedValue(undefined);
    hoisted.emitDispatchEventForJobStatusChange.mockResolvedValue(undefined);
    hoisted.fetchJobContextForArtifactEvent.mockResolvedValue({ project_id: 'p99' });
    hoisted.jobUpdate.mockResolvedValue({ id: 'j1', status: 'submitted' });
    hoisted.emitCanonicalEventsForTimeEntry.mockResolvedValue('evt-travel');
    hoisted.emitArrivalForClockIn.mockResolvedValue('evt-arrival');
    hoisted.createTimeEntry.mockResolvedValue({ id: 'te1' });
    hoisted.getTravelStartLocationOptional.mockResolvedValue(null);
  });

  it('emits closeout_event before dispatch_event before Job.update when submitting from pending_closeout', async () => {
    const order: string[] = [];
    hoisted.emitCloseoutEvent.mockImplementation(async () => {
      order.push('closeout');
    });
    hoisted.emitDispatchEventForJobStatusChange.mockImplementation(async () => {
      order.push('dispatch');
    });
    hoisted.jobUpdate.mockImplementation(async () => {
      order.push('update');
      return {};
    });

    await executeJobStateTransitionMutation({
      job: baseJob,
      user,
      evidence: [],
      toStatus: 'submitted',
      fromStatus: 'pending_closeout',
      isOverride: false,
      overrideReason: '',
      dispatchOverrides: undefined,
    });

    expect(order).toEqual(['closeout', 'dispatch', 'update']);
    expect(hoisted.emitCloseoutEvent).toHaveBeenCalledTimes(1);
    const closeoutArg = hoisted.emitCloseoutEvent.mock.calls[0][0];
    expect(closeoutArg.job).toMatchObject({ id: 'j1', project_id: 'p99' });
    expect(closeoutArg.closeoutSubmitTimestampIso).toBeDefined();
    expect(hoisted.jobUpdate).toHaveBeenCalledWith(
      'j1',
      expect.objectContaining({
        status: 'submitted',
        closeout_submitted_at: closeoutArg.closeoutSubmitTimestampIso,
      })
    );
  });

  it('does not emit closeout_event for other transitions', async () => {
    await executeJobStateTransitionMutation({
      job: { ...baseJob, status: 'checked_in' },
      user,
      evidence: [],
      toStatus: 'in_progress',
      fromStatus: 'checked_in',
      isOverride: false,
      overrideReason: '',
      dispatchOverrides: undefined,
    });
    expect(hoisted.emitCloseoutEvent).not.toHaveBeenCalled();
    expect(hoisted.emitDispatchEventForJobStatusChange).toHaveBeenCalled();
    expect(hoisted.jobUpdate).toHaveBeenCalled();
  });

  it('does not emit closeout_event when submitting from non-pending_closeout', async () => {
    await executeJobStateTransitionMutation({
      job: { ...baseJob, status: 'submitted' },
      user,
      evidence: [],
      toStatus: 'approved',
      fromStatus: 'submitted',
      isOverride: false,
      overrideReason: '',
      dispatchOverrides: undefined,
    });
    expect(hoisted.emitCloseoutEvent).not.toHaveBeenCalled();
  });

  it('Iteration 15: assigned→en_route emits dispatch then travel_start then Job.update', async () => {
    const order: string[] = [];
    hoisted.emitDispatchEventForJobStatusChange.mockImplementation(async () => {
      order.push('dispatch');
    });
    hoisted.emitCanonicalEventsForTimeEntry.mockImplementation(async (opts) => {
      order.push(`canonical:${opts.entryType}`);
    });
    hoisted.createTimeEntry.mockImplementation(async () => {
      order.push('timeEntry');
      return { id: 'te1' };
    });
    hoisted.jobUpdate.mockImplementation(async () => {
      order.push('update');
      return {};
    });

    const eta = '2026-03-20T14:00:00.000Z';
    await executeJobStateTransitionMutation({
      job: { id: 'j1', status: 'assigned' },
      user,
      evidence: [],
      timeEntries: [],
      toStatus: 'en_route',
      fromStatus: 'assigned',
      isOverride: false,
      overrideReason: '',
      dispatchOverrides: { eta_ack_timestamp: eta },
    });

    expect(order).toEqual(['dispatch', 'canonical:travel_start', 'timeEntry', 'update']);
    expect(hoisted.emitCanonicalEventsForTimeEntry).toHaveBeenCalledWith(
      expect.objectContaining({
        entryType: 'travel_start',
        timestamp: eta,
        etaAckTimestamp: eta,
      })
    );
    expect(hoisted.emitArrivalForClockIn).not.toHaveBeenCalled();
  });

  it('Iteration 15: en_route→checked_in with open travel emits dispatch then travel_end then Job.update', async () => {
    const order: string[] = [];
    hoisted.emitDispatchEventForJobStatusChange.mockImplementation(async () => {
      order.push('dispatch');
    });
    hoisted.emitCanonicalEventsForTimeEntry.mockImplementation(async (opts) => {
      order.push(`canonical:${opts.entryType}`);
    });
    hoisted.createTimeEntry.mockImplementation(async () => {
      order.push('timeEntry');
      return { id: 'te2' };
    });
    hoisted.jobUpdate.mockImplementation(async () => {
      order.push('update');
      return {};
    });

    await executeJobStateTransitionMutation({
      job: { id: 'j1', status: 'en_route' },
      user,
      evidence: [],
      timeEntries: [
        {
          job_id: 'j1',
          entry_type: 'travel_start',
          timestamp: '2026-03-20T13:00:00.000Z',
        },
      ],
      toStatus: 'checked_in',
      fromStatus: 'en_route',
      isOverride: false,
      overrideReason: '',
      dispatchOverrides: undefined,
    });

    expect(order).toEqual(['dispatch', 'canonical:travel_end', 'timeEntry', 'update']);
    expect(hoisted.emitCanonicalEventsForTimeEntry).toHaveBeenCalledWith(
      expect.objectContaining({
        entryType: 'travel_end',
        travelMinutes: expect.any(Number),
      })
    );
    expect(hoisted.emitArrivalForClockIn).not.toHaveBeenCalled();
    expect(hoisted.jobUpdate).toHaveBeenCalledWith(
      'j1',
      expect.objectContaining({
        status: 'checked_in',
        check_in_time: expect.any(String),
      })
    );
  });

  it('Iteration 15: en_route→checked_in without open travel emits dispatch then emitArrivalForClockIn then Job.update', async () => {
    const order: string[] = [];
    hoisted.emitDispatchEventForJobStatusChange.mockImplementation(async () => {
      order.push('dispatch');
    });
    hoisted.emitArrivalForClockIn.mockImplementation(async () => {
      order.push('arrival');
      return 'a1';
    });
    hoisted.jobUpdate.mockImplementation(async () => {
      order.push('update');
      return {};
    });

    await executeJobStateTransitionMutation({
      job: { id: 'j1', status: 'en_route' },
      user,
      evidence: [],
      timeEntries: [],
      toStatus: 'checked_in',
      fromStatus: 'en_route',
      isOverride: false,
      overrideReason: '',
      dispatchOverrides: undefined,
    });

    expect(order).toEqual(['dispatch', 'arrival', 'update']);
    expect(hoisted.emitCanonicalEventsForTimeEntry).not.toHaveBeenCalled();
    expect(hoisted.emitArrivalForClockIn).toHaveBeenCalledTimes(1);
  });
});
