# Purpulse Field App — Developer Handoff README
**Version:** 1.0.0 | **Date:** 2026-03-16 | **Stack:** React 18, Tailwind CSS 3, Vite

---

## Table of Contents
1. [Architecture Overview](#architecture)
2. [Routing & Layout](#routing)
3. [Offline Behavior & Sync Queue](#offline)
4. [client_event_id — Idempotency Protocol](#idempotency)
5. [Queue Semantics](#queue)
6. [Key Entities](#entities)
7. [Component System](#components)
8. [Design Tokens](#tokens)
9. [Accessibility Standards](#a11y)
10. [QA Test Cases](#qa)
11. [Release Readiness Checklist](#checklist)

---

## 1. Architecture Overview {#architecture}

```
┌──────────────────────────────────────────────────────┐
│  React 18 SPA (Vite)                                  │
│  ┌───────────┐  ┌──────────────┐  ┌───────────────┐  │
│  │  Field UI │  │  Admin UI    │  │  Dev Tools    │  │
│  │  /Jobs    │  │  /AdminJobs  │  │  /DevModel    │  │
│  │  /JobDet. │  │  /AdminQC    │  │  Inputs       │  │
│  │  /TimeLog │  │  /AdminSnap  │  └───────────────┘  │
│  │  /Support │  │  /AdminAudit │                      │
│  └─────┬─────┘  └──────┬───────┘                      │
│        │               │                              │
│  ┌─────▼───────────────▼──────────────────────────┐  │
│  │  Base44 SDK (@/api/base44Client)               │  │
│  │  entities.*  integrations.Core  auth           │  │
│  └──────────────────────┬─────────────────────────┘  │
└─────────────────────────┼────────────────────────────┘
                          │ HTTPS / REST
                ┌─────────▼──────────┐
                │  Base44 Backend    │
                │  Postgres + BaaS   │
                └────────────────────┘
```

### Technology Choices
| Concern | Solution |
|---------|---------|
| State / data fetching | TanStack Query v5 |
| Routing | React Router v6 (pages.config.js + App.jsx) |
| Styling | Tailwind CSS v3 + CSS custom properties |
| Form handling | React Hook Form + Zod |
| Animations | Framer Motion (respects prefers-reduced-motion) |
| Drag and drop | @hello-pangea/dnd |
| Toast notifications | Sonner |
| Date math | date-fns |

---

## 2. Routing & Layout {#routing}

**IMPORTANT:** `pages.config.js` is no longer auto-generated. Every new page must be manually registered.

### Adding a new page
1. Create `pages/MyPage.jsx`
2. Add import + route to `pages.config.js`:
   ```js
   import MyPage from './pages/MyPage';
   export const PAGES = { ..., "MyPage": MyPage };
   ```
3. App.jsx's loop picks it up automatically.

### Layout system
- `Layout.jsx` — wraps all non-admin pages. Provides bottom tab bar, skip link, SyncIndicator.
- `AdminShell` — wraps all `/Admin*` pages directly (not via Layout).
- Pages in `HIDE_NAV_PAGES = ['JobDetail']` get no bottom nav.

---

## 3. Offline Behavior & Sync Queue {#offline}

The app is **offline-first**. Technicians in the field frequently lose connectivity.

### How it works

```
User Action → SyncQueue.create({ status: 'pending', client_request_id })
                ↓
          useJobQueue hook polls online status
                ↓
          navigator.onLine === true
                ↓
          Flush queue: POST /api/v1/sync/batch
                ↓
          Per-item: success → status='completed' | failure → retry with backoff
```

### Key hooks
- **`useJobQueue`** (`hooks/useJobQueue.js`) — manages job timer events, online detection, and retry logic.
- **`useUploadQueue`** (`hooks/useUploadQueue.js`) — manages evidence file uploads with pause/resume/cancel/retry.

### LocalStorage keys
| Key | Contents |
|-----|---------|
| `purpulse_time_edit_queue` | JSON array of offline TimeEntry edits |
| `purpulse_device_id` | Persistent device identifier `dev-{ts36}-{rand6}` |
| `purpulse_jobs_filter` | Last selected job list filter tab |
| `purpulse_onboarded` | Boolean flag — skip onboarding on next launch |

### Degraded mode
If camera/location permissions are denied during onboarding, the app enters **degraded mode**:
- Evidence capture falls back to file-input (no live camera view)
- GPS stamps are omitted (geo_lat/geo_lon = null)
- A persistent banner informs the user to grant permissions in device settings

---

## 4. client_event_id — Idempotency Protocol {#idempotency}

**All mutative API calls must include `X-Client-Event-Id`.**

### Generation
```js
function genClientEventId() {
  return `evt-${Date.now().toString(36)}-${Math.random().toString(36).substr(2, 8)}`;
}
// Example: evt-lx3k7z-a4f9b2c1
```

### Rules
1. **Generate once** — create the ID before the first attempt.
2. **Reuse on retry** — re-send the exact same ID if the request fails with 5xx or network error.
3. **Do not reuse across different operations** — each logical action gets a unique ID.
4. **Server deduplication window** — 24 hours. After that, the same ID may create a new record.

### Response codes
| Code | Meaning |
|------|---------|
| `201` | New record created |
| `200` | Duplicate — original response returned, no side-effects |
| `409` | Conflict (e.g. overlapping time entry) — do NOT retry automatically |

### Where it's used
- `POST /jobs/{id}/events` → `X-Client-Event-Id` = event.client_event_id
- `PATCH /time-entries/{id}` → `X-Client-Event-Id` = new ID per edit
- `POST /jobs/{id}/evidence` → `X-Client-Event-Id` = new ID per upload
- `POST /sync/batch` → outer header + per-item `client_request_id`

---

## 5. Queue Semantics {#queue}

### SyncQueue state machine
```
pending → in_progress → completed
              ↓
           failed → pending (on retry, retry_count++)
                        ↓
                     failed (max_retries=5 exceeded)
```

### Retry backoff
```
attempt 1: immediate
attempt 2: 30s
attempt 3: 2m
attempt 4: 10m
attempt 5: 30m
```

### UploadQueue (evidence files)
```
idle → queued → uploading → processing (QC) → done
                    ↓                              ↓
                 paused ←──────────── error (retryable)
```

- **pause/resume** — user can pause uploads mid-flight (stops after current chunk)
- **cancel** — removes item from queue, does not delete entity record
- **retry** — resets status to 'queued', increments retry_count
- **clearDone** — removes completed items from UI list (not from database)

---

## 6. Key Entities {#entities}

| Entity | Key Fields | Notes |
|--------|-----------|-------|
| `Job` | status, priority, assigned_to, runbook_phases | Central entity. Status drives UI state machine. |
| `TimeEntry` | job_id, entry_type, timestamp, locked, client_request_id | Paired entries (start/stop). Never delete — append only. |
| `Evidence` | job_id, evidence_type, file_url, quality_score, qc_status | Files stored externally; entity holds metadata + QC results. |
| `Blocker` | job_id, blocker_type, severity, status | Open blockers prevent job closeout. |
| `ChatMessage` | job_id, body, attachments | Real-time thread per job. |
| `SyncQueue` | entity_type, action, payload, status, retry_count | Offline queue. Cleared on sync completion. |

---

## 7. Component System {#components}

See `component-catalog.json` for full props/variants.

### Field Components (`components/field/`)
| Component | Purpose |
|-----------|---------|
| `JobCard` | Swipeable job list item |
| `TimerPanel` | Live work session timer |
| `EvidenceTile` | QC-aware evidence thumbnail |
| `EvidenceCapture` | Multi-step capture flow orchestrator |
| `CameraOverlay` | Full-screen camera with reticle/GPS/tags |
| `RunbookView` | Phased task checklist |
| `DailyTimeline` | Drag-to-edit time segment visualizer |
| `QuickActionsBar` | 60px action button row |
| `StatusBadge` | Job/sync status pill |
| `SyncIndicator` | Floating connectivity pill |
| `OfflineBanner` | Persistent offline warning |

### Admin Components (`components/admin/`)
| Component | Purpose |
|-----------|---------|
| `AdminShell` | Sidebar + topbar layout |

---

## 8. Design Tokens {#tokens}

See `design-tokens.json` for full specification.

### CSS Variable usage (in JSX/CSS)
```css
:root {
  --color-primary:      #0f172a;
  --color-surface:      #ffffff;
  --color-background:   #f8fafc;
  --color-border:       #f1f5f9;
  --color-text-primary: #0f172a;
  --color-text-muted:   #94a3b8;
  --radius-xl:          20px;
  --shadow-card:        0 2px 12px rgba(0,0,0,0.06);
  --touch-target-min:   44px;
}
```

### Tailwind mapping
All tokens map 1:1 to Tailwind utilities. Use Tailwind classes directly:
- Colors: `bg-slate-900 text-slate-400`
- Radii: `rounded-2xl` (24px)
- Shadows: `shadow-sm shadow-lg`

---

## 9. Accessibility Standards {#a11y}

| Standard | Implementation |
|----------|---------------|
| Touch targets | 44px minimum (WCAG 2.5.5) — enforced via `min-h-[44px]` |
| Color contrast | All text/bg pairs ≥ 4.5:1 (WCAG AA) |
| Focus ring | `:focus-visible { outline: 2px solid #0f172a; outline-offset: 2px; }` |
| Skip link | `.skip-link` in Layout.jsx |
| Screen reader | `aria-label`, `aria-live`, `aria-current`, `role` on all interactive elements |
| Reduced motion | `@media (prefers-reduced-motion)` zeros all transitions in globals.css |
| Keyboard nav | All interactive elements reachable via Tab; Enter activates |
| Haptic feedback | `lib/haptics.js` — respects prefers-reduced-motion; silent on unsupported devices |

---

## 10. QA Test Cases {#qa}

### Functional

| ID | Test | Expected |
|----|------|---------|
| F-01 | Tap job card → navigate to JobDetail | JobDetail page loads with correct job ID |
| F-02 | Swipe left on JobCard > 60px | Maps + Call buttons revealed |
| F-03 | Tap Start timer on assigned job | TimerPanel shows "Working", elapsed ticks up |
| F-04 | Toggle break, then resume | State transitions: working → break → working |
| F-05 | Go offline, start timer | Toast "Queued for sync"; SyncQueue item created |
| F-06 | Come back online after F-05 | Item synced, SyncQueue status = completed |
| F-07 | Re-send same client_event_id | Server returns 200 (not 201), no duplicate TimeEntry |
| F-08 | Capture evidence with camera | EvidenceTile appears with "Uploading" ring |
| F-09 | Evidence QC fails (quality_score < 40) | Tile shows red "QC Failed" ring |
| F-10 | Admin locks time entry | TimeSegmentModal shows locked state; edit disabled |
| F-11 | Admin unlocks then edit | Override reason required; TimeEntry updated with drag_edit source |
| F-12 | Submit closeout with missing evidence | Validation error shown; submit blocked |
| F-13 | SyncQueue max_retries exceeded | Item marked failed; Support page shows error |
| F-14 | Open Diagnostics modal on Support | Device ID, network status, last 50 HTTP errors shown |

### Accessibility

| ID | Test | Expected |
|----|------|---------|
| A-01 | Tab through Jobs page | All job cards, filters, search focusable in order |
| A-02 | Screen reader on JobCard | Reads: "Title, status, urgent" |
| A-03 | Activate skip link | Focus jumps to #main-content |
| A-04 | SyncIndicator announced | `role=status` announces state change without interrupting |
| A-05 | Reduced motion OS setting | All animations disabled |
| A-06 | CameraOverlay dialog | Focus trapped; Escape closes |

### Offline / Sync

| ID | Test | Expected |
|----|------|---------|
| O-01 | Kill network during upload | Upload pauses; retry on reconnect |
| O-02 | Multiple retries (up to max) | Exponential backoff respected |
| O-03 | Retry All in Support | All failed items re-queued |
| O-04 | Batch sync flush | Single POST /sync/batch with all pending items |
| O-05 | Partial batch failure | Successful items committed; failed items remain pending |

### Admin

| ID | Test | Expected |
|----|------|---------|
| AD-01 | Reassign job | Job.assigned_to updated; toast shown |
| AD-02 | QC manual override | Evidence.qc_status updated; audit entry created |
| AD-03 | Face redaction toggle | Evidence.face_redacted toggled; tile blurs/unblurs |
| AD-04 | Create snapshot | SyncQueue item with entity_type='snapshot' created |
| AD-05 | Audit log search by client_event_id | Matching entries filtered in real-time |

---

## 11. Release Readiness Checklist {#checklist}

### Code Quality
- [ ] All ESLint warnings resolved (zero errors)
- [ ] No `console.log` in production code (use `console.info` with `[Purpulse]` prefix)
- [ ] All TODO / FIXME comments addressed or ticketed
- [ ] Dependencies audited (`npm audit`) — zero high/critical

### Functionality
- [ ] All F-01 through F-14 test cases pass
- [ ] All O-01 through O-05 offline tests pass
- [ ] All AD-01 through AD-05 admin tests pass
- [ ] Evidence upload succeeds end-to-end on real device
- [ ] Closeout + signature flow completes and submits

### Accessibility
- [ ] All A-01 through A-06 accessibility tests pass
- [ ] Lighthouse Accessibility score ≥ 90
- [ ] Manual keyboard-only navigation test complete
- [ ] VoiceOver (iOS) smoke test on JobCard + TimerPanel

### Performance
- [ ] Lighthouse Performance score ≥ 75 on mobile throttle
- [ ] Initial JS bundle < 400 KB gzipped
- [ ] Job list renders 100 items without jank
- [ ] Images lazy-loaded / thumbnails used in lists

### Security
- [ ] Auth required on all non-public routes
- [ ] Admin-only pages check `user.role === 'admin'`
- [ ] No API keys or secrets in frontend code
- [ ] File uploads validated (type + size) client-side

### Deployment
- [ ] Environment variables set in production (BASE44_APP_ID, etc.)
- [ ] CORS configured for production domain
- [ ] Error boundary added to root (catches white-screen crashes)
- [ ] Sentry / error monitoring configured
- [ ] App version injected at build time (`VITE_APP_VERSION`)

### Documentation
- [ ] This HANDOFF_README.md reviewed by lead developer
- [ ] openapi.yaml validated with Swagger Editor
- [ ] design-tokens.json imported into Figma (via Token Studio plugin)
- [ ] component-catalog.json reviewed by design system team
- [ ] Storybook stories created for JobCard, TimerPanel, EvidenceTile

---

*Generated by Base44 AI — Purpulse v1.0.0*
