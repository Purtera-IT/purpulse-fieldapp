# Purpulse Field App — Developer Handoff

> **Stack**: React 18 · Vite · Tailwind CSS · TanStack Query v5 · Base44 BaaS  
> **Targets**: iOS 16+, Android 10+, Chrome/Edge (admin console)  
> **Last updated**: 2026-03-16

---

## Table of Contents

1. [Architecture overview](#1-architecture-overview)
2. [Offline behaviour](#2-offline-behaviour)
3. [client_event_id policy](#3-client_event_id-policy)
4. [Syncing & SyncQueue](#4-syncing--syncqueue)
5. [Time entry flow](#5-time-entry-flow)
6. [Evidence upload flow](#6-evidence-upload-flow)
7. [Role & permission model](#7-role--permission-model)
8. [Admin console pages](#8-admin-console-pages)
9. [TechPulse model-input packaging](#9-techpulse-model-input-packaging)
10. [Key files reference](#10-key-files-reference)

---

## 1. Architecture overview

```
Mobile App (React PWA)
   │
   ├─ Base44 BaaS (entities: Job, Evidence, TimeEntry, SyncQueue, ...)
   │     └─ Real-time subscriptions via base44.entities.*.subscribe()
   │
   ├─ SyncQueue (localStorage + DB) ──► /api/v1/sync/flush
   │
   └─ ADLS Gen2  ──► evidence blobs + dataset snapshots
                     abfs://purpulse-snapshots@purpulsestorage.dfs.core.windows.net/
```

All writes go through the **SyncQueue pattern**:

1. Write optimistically to local state + create a `SyncQueue` record.
2. Attempt immediate API call (if online).
3. On failure / offline → item stays `pending` in SyncQueue.
4. On reconnect (`window.online`) → `flushOfflineQueue()` processes all pending items.

---

## 2. Offline behaviour

### What works offline

| Feature | Offline behaviour |
|---|---|
| View jobs list | ✅ Served from TanStack Query cache (staleTime: 30 s) |
| Job detail | ✅ Cached from last fetch |
| Start/stop timer | ✅ TimeEntry written locally, queued for sync |
| Capture evidence | ✅ Photo saved to device; Evidence record queued; upload retried on reconnect |
| Add note | ✅ ChatMessage queued |
| Report blocker | ✅ Blocker entity queued |
| Runbook step complete | ✅ Job entity update queued |
| Admin console | ⚠️ Read-only with stale data; mutations will queue |
| QC overrides | ❌ Requires connectivity (supervisor action) |

### Offline storage layers

```
localStorage keys:
  purpulse_device_id          Stable device identifier
  purpulse_onboarded          Onboarding completion flag
  purpulse_time_edit_queue    Drag/manual time edit overflow queue (pre-SyncQueue flush)
  purpulse_permissions        Camera / location permission flags
  purpulse_jobs_filter        Last-used jobs filter chip

TanStack Query cache:
  ['jobs']                    Job list (staleTime 30 s, gcTime 10 min)
  ['job', id]                 Job detail (refetchInterval 15 s when active)
  ['evidence', jobId]         Per-job evidence (invalidated after capture)
  ['all-time-entries']        All time entries (invalidated after edit)

SyncQueue entity (DB):
  Persistent offline queue visible in Support > Queued Items
  Retry logic: max_retries=5, exponential backoff via next_retry_at
```

### Reconnect flow

```js
// hooks/useJobQueue.js
window.addEventListener('online', async () => {
  await flushOfflineQueue(queryClient);  // flush purpulse_time_edit_queue
  await syncQueueProcessor.flush();      // process SyncQueue pending items
});
```

---

## 3. client_event_id policy

### Purpose

`client_event_id` (also stored as `client_request_id` on entity fields) is an **idempotency key** generated client-side. It allows:

- **Deduplication** — if a request times out and is retried, the server returns the original response without re-processing.
- **Audit tracing** — paste any `client_event_id` into the Audit Log search to trace an event across all retries.
- **Offline sync reconciliation** — the SyncQueue stores `client_event_id` on every item; the flush endpoint reports per-item `status: 'duplicate'` for already-processed events.

### Generation

```js
// Standard format: evt-{timestamp base-36}-{8 random hex chars}
const clientEventId = () =>
  `evt-${Date.now().toString(36)}-${Math.random().toString(36).substr(2, 8)}`;
```

### Scope rules

| Rule | Detail |
|---|---|
| One ID per event | Each discrete action (capture photo, start timer, send message) gets its own ID |
| ID never reused | Even on retry, reuse the SAME original ID (not a new one) |
| Stored on entity | `TimeEntry.client_request_id`, `Evidence` (via SyncQueue), `ChatMessage.client_message_id` |
| Persisted offline | Stored in SyncQueue.client_request_id so it survives app restarts |
| Server dedup window | 7 days (configurable) |

### Required API headers

```
X-Device-ID: dev-m8x2k1-abc123
X-Client-Request-ID: evt-lq7f2r-a8c91b2d
```

---

## 4. Syncing & SyncQueue

### SyncQueue entity schema

```json
{
  "entity_type": "time_entry | evidence | blocker | chat_message | closeout | snapshot | device_registration",
  "entity_id": "string (DB id of the target record, if exists)",
  "action": "create | update | delete",
  "payload": "JSON stringified data object",
  "client_request_id": "evt-...",
  "status": "pending | in_progress | completed | failed",
  "retry_count": 0,
  "max_retries": 5,
  "last_error": "string | null",
  "next_retry_at": "ISO datetime",
  "job_id": "string"
}
```

### Status transitions

```
pending ──► in_progress ──► completed
                │
                └──► failed (retry_count >= max_retries)
                       │
                       └──► pending  (admin "Retry All" in Support page)
```

### SyncIndicator (top-bar widget)

Polls SyncQueue every 5 s. Shows:
- 🟢 silent (all synced)
- 🔵 "N syncing…" (pending > 0)
- 🔴 "N failed" (failed > 0, tap to open Support)

### Viewing queued items

**Support → Queued Items** lists all non-completed SyncQueue records.
Per-item: entity type, action, job link, status badge, last error snippet, Retry / Cancel buttons.

---

## 5. Time entry flow

### Event types and pairing rules

| Start event | End event | Constraint |
|---|---|---|
| `work_start` | `work_stop` | Cannot overlap another work segment |
| `travel_start` | `travel_end` | — |
| `break_start` | `break_end` | Pauses work timer display |

### Sources

| Source | Description | Requires notes? |
|---|---|---|
| `app` | Button taps in TimerPanel / QuickActionsBar | No |
| `manual` | ManualTimeEntryModal | Yes (audit) |
| `drag_edit` | DailyTimeline drag handles | Yes (audit) |

### Locking

Admin/supervisor can lock all entries for a day (`TimeEntry.locked = true`).
Locked entries are **read-only on mobile** (TimerPanel shows lock icon; drag handles disabled).
Unlock requires the same admin role.

---

## 6. Evidence upload flow

```
1. User taps capture → CameraOverlay / file picker
2. EvidenceCapture creates Evidence record (status: pending_upload)
3. useUploadQueue picks up the record
4. POST /api/v1/evidence  { client_event_id, job_id, evidence_type, ... }
   ← { id, sas_url, sas_expires_at }
5. PUT sas_url  (binary JPEG/PNG — direct to Azure Blob)
6. POST /api/v1/evidence/{id}/complete  { checksum_sha256, actual_size_bytes }
   ← { status: processing, qc_job_id }
7. QC pipeline runs async → sets quality_score, quality_warning, face_detected
8. Evidence.status → uploaded; app polls and shows QcBadge
```

### Quality scoring thresholds

| Score | State | Colour |
|---|---|---|
| ≥ 80 | qc_ok | Green |
| 50–79 | qc_warning | Amber |
| < 50 | qc_failed | Red |
| null | processing | Purple |

### Offline handling

If offline at step 4: Evidence record stays `pending_upload`.  
`useUploadQueue` retries on reconnect. SyncQueue item created with `entity_type: evidence`.

---

## 7. Role & permission model

| Role | Value | Capabilities |
|---|---|---|
| View Only | `view_only` | Read jobs, view evidence (no edits) |
| Field Tech | `user` | Full job execution, capture, time tracking |
| Supervisor | `supervisor` | + QC overrides, time entry locking, reassign |
| Admin | `admin` | + user management, device revocation, snapshots, audit log |

Role is stored on the `User` entity (`user.role`).  
Checked client-side via `user?.role === 'admin'` (also enforced server-side).  
Admin-only backend functions return `403 Forbidden` for non-admin callers.

---

## 8. Admin console pages

All admin pages use `AdminShell` wrapper (dark sidebar, no global Layout nav bar).

| Page | Route | Key features |
|---|---|---|
| AdminJobs | `/AdminJobs` | Filter by status/priority, inline status change, Reassign modal |
| AdminQC | `/AdminQC` | Evidence table, QC badge filters, expand row for score detail, manual override |
| AdminSnapshot | `/AdminSnapshot` | Create snapshot (date range, scope, Parquet/CSV), ADLS path, Export buttons |
| AdminAuditLog | `/AdminAuditLog` | Merged log (SyncQueue + TimeEntries), filter by client_event_id / date range / type |
| AdminUsers | `/AdminUsers` | User list + role dropdown, Invite User modal, Devices tab with Revoke |
| AdminDevices | `/AdminDevices` | Redirects to AdminUsers#devices |

---

## 9. TechPulse model-input packaging

See **DevModelInputs page** (`/DevModelInputs`) for an interactive mock.

### Packaged payload structure

```json
{
  "schema_version": "1.0",
  "snapshot_id": "snap_abc123",
  "job": {
    "id": "job_xyz",
    "title": "...",
    "status": "submitted",
    "priority": "high",
    "site_lat": 51.5074,
    "site_lon": -0.1278,
    "scheduled_date": "2026-03-16",
    "runbook_phases": [ ... ],
    "fields_schema": [ ... ]
  },
  "evidence": [
    {
      "id": "ev_001",
      "evidence_type": "before_photo",
      "file_url": "https://cdn.purpulse.dev/...",
      "quality_score": 88,
      "geo_lat": 51.5074,
      "geo_lon": -0.1278,
      "captured_at": "2026-03-16T09:12:33Z",
      "runbook_step_id": "step_phase2_3",
      "device_meta": { "os": "iOS", "device_id": "dev-m8x2k1-abc123" }
    }
  ],
  "time_segments": [
    {
      "type": "work",
      "start": "2026-03-16T08:45:00Z",
      "end": "2026-03-16T12:30:00Z",
      "duration_seconds": 13500,
      "source": "app"
    }
  ],
  "durations_seconds": {
    "work": 13500,
    "travel": 1800,
    "break": 900
  },
  "blockers": [],
  "exported_at": "2026-03-16T14:00:00Z"
}
```

### Fields used by TechPulse

| Field path | ML use |
|---|---|
| `job.priority` | Target label weighting |
| `job.runbook_phases[*].steps[*].completed` | Completion sequence features |
| `evidence[*].quality_score` | Image quality signal |
| `evidence[*].evidence_type` | Evidence coverage completeness |
| `evidence[*].geo_lat/lon` | Spatial proximity to site |
| `time_segments[*].duration_seconds` | Time-on-site features |
| `durations_seconds.work` | Total labour hours |
| `blockers[*].severity` | Job complexity signal |

---

## 10. Key files reference

```
pages/
  Jobs.jsx              Job list with swipe cards + pull-to-refresh
  JobDetail.jsx         Full job execution screen (tabs: Runbook, Evidence, Fields, Chat)
  TimeLog.jsx           Daily timeline + drag handles + manual entry
  Support.jsx           Sync status, queued items, diagnostics, logout
  Onboarding.jsx        5-step setup wizard
  ActiveJob.jsx         Active job dashboard
  EvidenceHub.jsx       Cross-job evidence gallery
  AdminJobs.jsx         Jobs management console
  AdminQC.jsx           QC review console
  AdminSnapshot.jsx     Dataset snapshot + ADLS export tool
  AdminAuditLog.jsx     Searchable audit log (supports client_event_id filter)
  AdminUsers.jsx        Users + roles + devices
  DevModelInputs.jsx    TechPulse model-input mock viewer

components/field/
  TimerPanel.jsx        Live work timer (writes TimeEntry)
  DailyTimeline.jsx     Visual drag-to-edit timeline (exports buildSegments)
  EvidenceCapture.jsx   Camera → metadata → upload queue flow
  EvidenceTile.jsx      Thumbnail tile + QcBadge (importable standalone)
  QuickActionsBar.jsx   6-button contextual action row
  SyncIndicator.jsx     Top-bar sync status pill
  DiagnosticsModal.jsx  HTTP error log + device telemetry

components/admin/
  AdminShell.jsx        Dark sidebar shell for admin console

hooks/
  useJobQueue.js        startTimer, isOnline, pendingCount, failedCount
  useUploadQueue.js     Evidence upload queue processor

public/
  openapi.yaml          Full OpenAPI 3.1 spec (jobs, events, evidence, timesheets, sync)
  component-catalog.json All component props + variants
  HANDOFF_README.md     This document
```

---

## Quick-start for new developers

```bash
# 1. Clone and install
npm install

# 2. Start dev server
npm run dev

# 3. Seed sample jobs (runs in browser console)
import { base44 } from '@/api/base44Client';
base44.entities.Job.bulkCreate([ /* see component-catalog.json entity examples */ ])

# 4. View API spec
open public/openapi.yaml  # paste into editor.swagger.io

# 5. Explore component catalog
open public/component-catalog.json

# 6. Navigate to DevModelInputs
# http://localhost:5173/DevModelInputs
```
