/// <reference types="vite/client" />

/**
 * Job lifecycle transition: canonical telemetry ordering + Job.update payload (Iteration 14–15).
 * Closeout submit (pending_closeout → submitted): closeout_event → dispatch_event → persist.
 * Travel/arrival (Iteration 15): dispatch first, then travel_event / travel_end+arrival / arrival-only, then persist.
 *
 * Known simplifications (documented for future lifecycle work, e.g. Iteration 16+):
 * - **travel_start** is emitted only when `fromStatus === 'assigned'` and `toStatus === 'en_route'`.
 *   Other paths (rescheduled, resumed route, etc.) are not modeled here yet.
 * - **Check-in arrival** uses two intentional branches: if `computeOpenTravelMinutesForJob` finds an open
 *   `travel_start` segment, we emit `travel_end` (which chains travel closure + arrival check-in).
 *   Otherwise we emit `emitArrivalForClockIn` only. Do not collapse these without revisiting event-family
 *   expectations and legacy jobs without `travel_start` TimeEntries.
 * - **getTravelStartLocationOptional**: consent-gated, single optional GPS sample for travel_start payloads;
 *   not live tracking and not guaranteed to return coordinates.
 */

import { apiClient } from '@/api/client';
import { base44 } from '@/api/base44Client';
import { fetchJobContextForArtifactEvent } from '@/lib/artifactEvent';
import { emitCloseoutEvent } from '@/lib/closeoutEvent';
import { emitDispatchEventForJobStatusChange } from '@/lib/dispatchEvent';
import { deriveCloseoutSubmissionFlags } from '@/lib/closeoutSubmissionFlags';
import {
  computeOpenTravelMinutesForJob,
  emitArrivalForClockIn,
  emitCanonicalEventsForTimeEntry,
} from '@/lib/travelArrivalEvent';
import { getTravelStartLocationOptional } from '@/lib/travelGps';

type TransitionJob = Record<string, unknown> & { id: string | number };
type TransitionUser = Record<string, unknown> & { email?: string };

/** Minimal time entry shape for open-travel detection (matches API list items). */
export type TransitionTimeEntry = {
  entry_type?: string;
  timestamp?: string;
  job_id?: string | number;
};

function makeTimeEntryClientId() {
  return `evt-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export async function executeJobStateTransitionMutation({
  job,
  user,
  evidence = [],
  timeEntries = [],
  toStatus,
  fromStatus,
  isOverride,
  overrideReason,
  dispatchOverrides,
}: {
  job: TransitionJob;
  user: TransitionUser;
  evidence?: Array<Record<string, unknown>>;
  timeEntries?: TransitionTimeEntry[];
  toStatus: string;
  fromStatus: string;
  isOverride: boolean;
  overrideReason: string;
  dispatchOverrides: Record<string, unknown> | undefined;
}) {
  if (job?.id == null || !user) {
    throw new Error('Missing job or user');
  }

  const jobId = String(job.id);
  const closeoutSubmitIso =
    toStatus === 'submitted' && fromStatus === 'pending_closeout'
      ? new Date().toISOString()
      : null;

  if (closeoutSubmitIso) {
    try {
      /* Enrich closeout payload with project/site; same helper as artifact path (name is historical). */
      const jobCtx = await fetchJobContextForArtifactEvent(jobId);
      const jobForEvent = { ...job, ...jobCtx };
      const flags = deriveCloseoutSubmissionFlags(job, evidence);
      await emitCloseoutEvent({
        job: jobForEvent,
        user,
        ...flags,
        closeoutSubmitTimestampIso: closeoutSubmitIso,
        invoiceSupportDocsFlag: null,
        portalUpdateFlag: null,
        timecardSubmittedFlag: null,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (import.meta.env.DEV) console.error('[JobStateTransitioner] closeout_event', e);
      throw new Error(`Telemetry: ${msg}`);
    }
  }

  try {
    await emitDispatchEventForJobStatusChange({
      job,
      targetAppStatus: toStatus,
      user,
      overrides:
        dispatchOverrides && typeof dispatchOverrides === 'object' ? dispatchOverrides : {},
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (import.meta.env.DEV) console.error('[JobStateTransitioner] dispatch_event', e);
    throw new Error(`Telemetry: ${msg}`);
  }

  let checkInIso: string | null = null;

  /** Travel canonical emission: intentionally only assigned → en_route (see module header). */
  const toEnRoute = toStatus === 'en_route' && fromStatus === 'assigned';
  if (toEnRoute) {
    const overrides =
      dispatchOverrides && typeof dispatchOverrides === 'object' ? dispatchOverrides : {};
    const ackRaw = overrides.eta_ack_timestamp;
    const travelDepartureIso =
      typeof ackRaw === 'string' && ackRaw ? ackRaw : new Date().toISOString();
    const etaAck =
      typeof ackRaw === 'string' && ackRaw ? ackRaw : travelDepartureIso;

    let travelLocation: Record<string, unknown> | null = null;
    try {
      /* One-shot sample if user allowed precise location; never required; not continuous tracking. */
      travelLocation = (await getTravelStartLocationOptional()) as Record<
        string,
        unknown
      > | null;
    } catch {
      travelLocation = null;
    }

    try {
      await emitCanonicalEventsForTimeEntry({
        job,
        user,
        entryType: 'travel_start',
        timestamp: travelDepartureIso,
        etaAckTimestamp: etaAck,
        location: travelLocation,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (import.meta.env.DEV) console.error('[JobStateTransitioner] travel_event', e);
      throw new Error(`Telemetry: ${msg}`);
    }

    try {
      await apiClient.createTimeEntry(jobId, {
        job_id: jobId,
        entry_type: 'travel_start',
        timestamp: travelDepartureIso,
        source: 'app',
        sync_status: 'pending',
        locked: false,
        client_request_id: makeTimeEntryClientId(),
      });
    } catch (e) {
      if (import.meta.env.DEV) {
        console.warn('[jobStateTransitionMutation] travel_start TimeEntry failed', e);
      }
    }
  }

  if (toStatus === 'checked_in') {
    checkInIso = new Date().toISOString();
    const entries = timeEntries ?? [];
    const travelMinutes = computeOpenTravelMinutesForJob(entries, jobId, checkInIso);

    try {
      /* Intentional fork: open travel segment → travel_end + arrival in one helper; else arrival-only. */
      if (travelMinutes !== null) {
        await emitCanonicalEventsForTimeEntry({
          job,
          user,
          entryType: 'travel_end',
          timestamp: checkInIso,
          travelMinutes,
          location: null,
        });
        try {
          await apiClient.createTimeEntry(jobId, {
            job_id: jobId,
            entry_type: 'travel_end',
            timestamp: checkInIso,
            source: 'app',
            sync_status: 'pending',
            locked: false,
            client_request_id: makeTimeEntryClientId(),
          });
        } catch (e) {
          if (import.meta.env.DEV) {
            console.warn('[jobStateTransitionMutation] travel_end TimeEntry failed', e);
          }
        }
      } else {
        await emitArrivalForClockIn({
          job,
          user,
          timestamp: checkInIso,
          location: null,
        });
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (import.meta.env.DEV) console.error('[JobStateTransitioner] arrival/travel_end', e);
      throw new Error(`Telemetry: ${msg}`);
    }
  }

  const now = new Date().toISOString();
  const timeFields: Record<string, string> = {};
  if (toStatus === 'checked_in' && checkInIso) {
    timeFields.check_in_time = checkInIso;
  }
  if (toStatus === 'in_progress' && fromStatus !== 'paused') {
    timeFields.work_start_time = now;
    const checkIn = job.check_in_time;
    timeFields.check_in_time =
      typeof checkIn === 'string' && checkIn ? checkIn : now;
  }
  if (toStatus === 'pending_closeout') {
    timeFields.work_end_time = now;
  }
  if (closeoutSubmitIso) {
    timeFields.closeout_submitted_at = closeoutSubmitIso;
  }

  const payload: Record<string, unknown> = {
    status: toStatus,
    ...timeFields,
    ...(isOverride && {
      override_reason: overrideReason,
      overridden_by: user.email,
    }),
  };

  return base44.entities.Job.update(jobId, payload);
}
