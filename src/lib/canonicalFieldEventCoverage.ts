/**
 * Iteration 14 — human-readable audit map: canonical event families vs field-v2 surfaces.
 *
 * **NOT a runtime source of truth.** Do not import this module to drive routing, feature flags, or
 * emission logic — the app does not read these rows at runtime. Maintainers use it (plus
 * canonicalFieldEventCoverage.test.ts) to catch renames and document gaps. All real behavior lives
 * in src/lib/*Event.js, jobContextField.js, and call sites.
 *
 * The registry can list families that are only partially covered in canonical v2 (e.g. travel); do
 * not assume “listed” implies “fully emitted on FieldJobDetail.” Read each row’s `notes`.
 */

export const ITERATION_14_REQUIRED_FAMILIES = [
  'dispatch',
  'travel',
  'arrival',
  'runbook_step',
  'artifact',
  'qc',
  'closeout',
  'escalation',
  'feedback',
  'tool_check',
  'job_context',
] as const

export type Iteration14EventFamily = (typeof ITERATION_14_REQUIRED_FAMILIES)[number]

export type FamilyCoverageRow = {
  /** Primary implementation module (path from repo root). */
  emitterModule: string
  /** Exported emit/build entrypoints. */
  emitExports: string[]
  /** Canonical FieldJobDetail / fieldv2 touchpoints. */
  v2Surfaces: string[]
  notes: string
}

/**
 * One row per Iteration-14 family. Travel and arrival share travelArrivalEvent.js by design.
 */
export const CANONICAL_FIELD_EVENT_COVERAGE: Record<Iteration14EventFamily, FamilyCoverageRow> = {
  dispatch: {
    emitterModule: 'src/lib/dispatchEvent.js',
    emitExports: ['emitDispatchEventForJobStatusChange'],
    v2Surfaces: ['JobStateTransitioner', 'useJobQueue (FieldJobs timer)'],
    notes: 'emit-before-Job.update in JobStateTransitioner; closeout submit path chains after closeout_event',
  },
  travel: {
    emitterModule: 'src/lib/travelArrivalEvent.js',
    emitExports: ['buildTravelEventPayload', 'emitCanonicalEventsForTimeEntry'],
    v2Surfaces: [
      'JobStateTransitioner → jobStateTransitionMutation (assigned→en_route travel_start; en_route→checked_in travel_end when open segment)',
      'TimeLog/TimerPanel legacy',
    ],
    notes:
      'Iteration 15: dispatch_event first, then travel_event (travel_start) with optional consent GPS sample, then Job.update; travel_start/travel_end TimeEntry when apiClient succeeds. travel_start only on assigned→en_route (see jobStateTransitionMutation header). Legacy TimerPanel/TimeLog unchanged.',
  },
  arrival: {
    emitterModule: 'src/lib/travelArrivalEvent.js',
    emitExports: ['buildArrivalEventPayload', 'emitCanonicalEventsForTimeEntry', 'emitArrivalForClockIn'],
    v2Surfaces: [
      'JobStateTransitioner → jobStateTransitionMutation (check-in: travel_end+arrival_event or emitArrivalForClockIn)',
      'FieldTimeTracker (work_start → arrival_event work_start before TimeEntry)',
    ],
    notes:
      'Check-in after dispatch: travel_end+arrival when open travel_start segment exists, else emitArrivalForClockIn only — intentional fork (see jobStateTransitionMutation). work_start path still FieldTimeTracker-only for billable timer.',
  },
  runbook_step: {
    emitterModule: 'src/lib/runbookStepEvent.js',
    emitExports: ['emitRunbookStepEvent'],
    v2Surfaces: ['RunbookSteps'],
    notes: 'emit before persistOutcome (Job.update) on complete/fail; start emits before local session only',
  },
  artifact: {
    emitterModule: 'src/lib/artifactEvent.js',
    emitExports: ['emitArtifactEventForCompletedUpload'],
    v2Surfaces: ['fieldAdapters Base44UploadAdapter.completeUpload', 'EvidenceCaptureModal'],
    notes: 'After Evidence.create by design — payload needs persisted evidence id',
  },
  qc: {
    emitterModule: 'src/lib/qcEvent.js',
    emitExports: ['emitQcEvent'],
    v2Surfaces: ['fieldAdapters Base44LabelAdapter.createLabel', 'EvidenceGalleryView labeling'],
    notes: 'After LabelRecord.create — schema needs record linkage',
  },
  closeout: {
    emitterModule: 'src/lib/closeoutEvent.js',
    emitExports: ['emitCloseoutEvent'],
    v2Surfaces: ['JobStateTransitioner (pending_closeout→submitted)', 'CloseoutPreview legacy'],
    notes:
      'Flags: closeoutSubmissionFlags.ts deriveCloseoutSubmissionFlags; closeout_event before dispatch_event before Job.update on v2 submit (Iteration 14)',
  },
  escalation: {
    emitterModule: 'src/lib/escalationEvent.js',
    emitExports: ['emitEscalationEvent'],
    v2Surfaces: ['BlockerForm (JobCommsSection)', 'PMChatView', 'TasksTab'],
    notes: 'Iteration 14: emit before Blocker.create; escalation_record_id optional until row exists',
  },
  feedback: {
    emitterModule: 'src/lib/feedbackEvent.js',
    emitExports: ['emitFeedbackEvent'],
    v2Surfaces: ['JobCloseoutOutcomePanel', 'CloseoutPreview optional block'],
    notes: 'Iteration 14: emit before Job.update for technician outcome panel',
  },
  tool_check: {
    emitterModule: 'src/lib/toolCheckEvent.js',
    emitExports: ['emitToolCheckEvent'],
    v2Surfaces: ['PreJobToolCheckModal'],
    notes: 'Emit before parent transition continues',
  },
  job_context: {
    emitterModule: 'src/lib/jobContextField.js',
    emitExports: ['emitJobContextFieldIfChanged'],
    v2Surfaces: ['FieldJobDetail useEffect'],
    notes: 'Fingerprint dedupe; not tied to single entity mutation',
  },
}
