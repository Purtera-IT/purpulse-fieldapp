# Build changes

This folder stores **file lists** and **patches** for grouped implementation work so you can review, share, or re-apply changes without hunting through history.

---

## Iteration 1 — Shell & route consolidation

Canonical technician flow: `/FieldJobs` + `/FieldJobDetail`, 3-tab shell (Jobs / Support / Profile), legacy redirects, no mock fallbacks on canonical list/detail.

### Changed file list

**New**

- `src/utils/fieldRoutes.ts` — canonical path constants and `fieldJobDetailUrl()`
- `src/components/routing/LegacyJobDetailRedirect.jsx` — `/JobDetail` → `/FieldJobDetail` (preserves `id`, `tab`)

**Modified**

- `src/App.jsx`
- `src/App.tsx`
- `src/Layout.jsx`
- `src/pages.config.js`
- `src/pages/FieldJobs.jsx`
- `src/pages/FieldJobDetail.jsx`
- `src/pages/Onboarding.jsx`
- `src/pages/Profile.jsx`
- `src/pages/ActiveJob.jsx`
- `src/components/admin/AdminShell.jsx`
- `src/components/field/JobCard.jsx`

**Left on disk but removed from `pages.config.js` (legacy pages, not deleted)**

- `src/pages/Jobs.jsx`
- `src/pages/JobDetail.jsx`
- `src/pages/Chat.jsx`
- `src/pages/TimeLog.jsx`

**Follow-up cleanup (before Iteration 2)** — `mainPage` removed from `pages.config.js` (entry is `App.jsx` only); `HIDE_SHELL_PAGES` trimmed; `@deprecated LEGACY` file headers on the four legacy pages; shared field components link via `fieldJobDetailUrl` / `FIELD_JOB_TAB_RUNBOOK` instead of hardcoded `/JobDetail`.

### Patch

The unified diff is in:

**[`iteration-1-shell-routing.patch`](./iteration-1-shell-routing.patch)**

It was produced with:

```bash
git diff HEAD -- \
  src/App.jsx \
  src/App.tsx \
  src/Layout.jsx \
  src/pages.config.js \
  src/pages/FieldJobs.jsx \
  src/pages/FieldJobDetail.jsx \
  src/pages/Onboarding.jsx \
  src/components/admin/AdminShell.jsx \
  src/components/field/JobCard.jsx \
  src/pages/ActiveJob.jsx \
  src/pages/Profile.jsx

git diff --no-index /dev/null src/utils/fieldRoutes.ts
git diff --no-index /dev/null src/components/routing/LegacyJobDetailRedirect.jsx
```

(Those two `git diff --no-index` hunks are appended for files that were **untracked** at generation time.)

### How to use the patch

From the **repository root**:

```bash
# Dry run
git apply --check build-changes/iteration-1-shell-routing.patch

# Apply
git apply build-changes/iteration-1-shell-routing.patch
```

If paths or surrounding context drift, use `git apply --3way` or `patch -p1` and resolve conflicts manually.

### Note on scope

The patch includes **only** the paths above. Other edits in your working tree (docs moves, CI, Storybook, etc.) are **not** part of this file. If `App.jsx` (or others) also changed for unrelated reasons, those hunks appear together in the patch because they touch the same files.

---

## Iteration 2 — FieldJobDetail information architecture

Single workflow surface on `/FieldJobDetail`: **Overview | Runbook | Evidence | Closeout | Comms**. Time and meetings are no longer peer tabs; audit sits under Closeout as secondary. URL `?tab=` with legacy aliases: `timelog`→overview, `meetings`→comms, `audit`→closeout.

### Changed file list

**New**

- `src/components/fieldv2/jobExecutionNextStep.js` — `getNextStepMessage(job, evidence)` from real fields only
- `src/components/fieldv2/JobCloseoutSection.jsx` — closeout copy, `JobStateTransitioner`, `SignoffCapture`, `AuditTab` (secondary)
- `src/components/fieldv2/JobCommsSection.jsx` — job-context `ChatView` + `MeetingsTab` (secondary)

**Modified**

- `src/pages/FieldJobDetail.jsx` — five sections, `useSearchParams`, segment nav, next-step header line
- `src/components/fieldv2/JobOverview.jsx` — work session (`FieldTimeTracker` embedded), quick links, no duplicate closeout/evidence summary
- `src/components/fieldv2/FieldTimeTracker.jsx` — `variant="embedded"` for Overview
- `src/components/fieldv2/EvidenceGalleryView.jsx` — required vs uploaded strip when `job.evidence_requirements` exists

### Patch

**[`iteration-2-fieldjobdetail-ia.patch`](./iteration-2-fieldjobdetail-ia.patch)**

Re-run the command block below to refresh when Iteration 2 sources change. Last generated against `HEAD` **ab8753054a42e0c350ac6a2dc623550c49781b19** with:

```bash
git diff HEAD -- \
  src/pages/FieldJobDetail.jsx \
  src/components/fieldv2/EvidenceGalleryView.jsx \
  src/components/fieldv2/FieldTimeTracker.jsx \
  src/components/fieldv2/JobOverview.jsx

git diff --no-index /dev/null src/components/fieldv2/JobCloseoutSection.jsx
git diff --no-index /dev/null src/components/fieldv2/JobCommsSection.jsx
git diff --no-index /dev/null src/components/fieldv2/jobExecutionNextStep.js
```

(The three `git diff --no-index` hunks are appended for files that were **untracked** at generation time.)

### How to use the patch

From the **repository root**, on a tree whose **tracked** versions of the four modified files match **`ab87530…`** (or resolve conflicts if your base differs):

```bash
git apply --check build-changes/iteration-2-fieldjobdetail-ia.patch
git apply build-changes/iteration-2-fieldjobdetail-ia.patch
```

`git apply --check` will fail if those files already contain the post-iteration content or if your `HEAD` has drifted from the patch base. Use `git apply --3way` or re-generate the patch from your branch.

---

## Iteration 3 — FieldJobDetail execution state + work session

Canonical `/FieldJobDetail` uses **one derived view-model** from `job.status` (+ job timestamps) and **`TimeEntry[]`** for this job. **JobStateTransitioner** lives on **Overview** (not trapped in Closeout). **FieldTimeTracker** writes **`work_start` / `work_stop`** via `apiClient.createTimeEntry` + existing telemetry seams (`emitCanonicalEventsForTimeEntry`, `telemetryTimeClockStart`/`Stop`); no Activity-based session authority, no local “clocked” truth.

### Changed file list

**New**

- `src/lib/fieldJobExecutionModel.ts` — `LIFECYCLE_DISPLAY`, `deriveTimerSessionFromTimeEntries`, `buildFieldJobExecutionView`, `formatWorkedDuration`
- `src/lib/__tests__/fieldJobExecutionModel.test.ts` — unit tests for derivation / gating

**Modified**

- `src/pages/FieldJobDetail.jsx` — `fj-time-entries` query, `executionView`, compact header (lifecycle · timer on/off · worked time), `invalidateAll` includes time entries
- `src/components/fieldv2/FieldTimeTracker.jsx` — TimeEntry-based work timer; lifecycle gating from `executionView`
- `src/components/fieldv2/JobOverview.jsx` — mounts `JobStateTransitioner`; removed duplicate “Start Job” path; `LIFECYCLE_DISPLAY` from model
- `src/components/fieldv2/JobStateTransitioner.jsx` — `priorStatus` on transitions; sets `check_in_time` / `work_start_time` / `work_end_time` where appropriate; invalidates `fj-time-entries` on success

**Replaced relative to Iteration 2 Closeout shape**

- `src/components/fieldv2/JobCloseoutSection.jsx` — sign-off + audit only; lifecycle copy points to Overview (no duplicate `JobStateTransitioner` here)

### Patch

**[`iteration-3-fieldjobdetail-execution-time.patch`](./iteration-3-fieldjobdetail-execution-time.patch)**

Re-run the command block below to refresh when Iteration 3 sources change. Last generated against `HEAD` **ab8753054a42e0c350ac6a2dc623550c49781b19** with:

```bash
git diff HEAD -- \
  src/pages/FieldJobDetail.jsx \
  src/components/fieldv2/FieldTimeTracker.jsx \
  src/components/fieldv2/JobOverview.jsx \
  src/components/fieldv2/JobStateTransitioner.jsx

git diff --no-index /dev/null src/lib/fieldJobExecutionModel.ts
git diff --no-index /dev/null src/lib/__tests__/fieldJobExecutionModel.test.ts
git diff --no-index /dev/null src/components/fieldv2/JobCloseoutSection.jsx
```

(The three `git diff --no-index` hunks are for paths that were **untracked** at generation time; if they are tracked on your branch, drop those lines and use `git diff HEAD -- <paths>` instead.)

### How to use the patch

From the **repository root**, apply **after** Iteration 1/2 (or equivalent) so `FieldJobDetail` and field v2 components exist:

```bash
git apply --check build-changes/iteration-3-fieldjobdetail-execution-time.patch
git apply build-changes/iteration-3-fieldjobdetail-execution-time.patch
```

`git apply --check` succeeds only when the **modified** files match the patch base. Re-generate the patch if your tree has diverged.

### Note on scope

Telemetry queue modules, Azure ingestion, app shell, and evidence backend are **not** part of this patch. Iteration 3 only touches the canonical job detail execution/time presentation and related transition + time-entry wiring.

### Technical debt (track for Iteration 4/5)

- **`JobStateTransitioner`** still calls `base44.entities.Job.update` directly while other canonical field paths use `jobRepository` / `apiClient`. Marked in source with `TECHNICAL_DEBT`; converge on one job-write abstraction later. *(Still open after Iteration 4.)*

---

## Iteration 4 — FieldJobDetail evidence trust + deliverable mapping

Canonical **Evidence** tab treats items as **job deliverables**, not a generic gallery: real **`job.evidence_requirements`** drive completeness (uploaded vs in-flight vs missing), capture guides **evidence type** and **optional `runbook_step_id`** from embedded **`job.runbook_phases`**, and **fake upload progress / false “cloud uploaded” copy** is removed. **`Base44UploadAdapter.requestUploadToken`** exposes **`is_simulated_storage`**; manifest **`sync_status`** stays **`pending`** until a real HTTPS blob URL path exists. Per-item **record / storage** state (inline `data:` URL, `mock://`, errors) is surfaced honestly in thumbnails and the detail sheet.

### Changed file list

**New**

- `src/lib/fieldEvidenceViewModel.ts` — requirement partitions, runbook step flattening, evidence type option order, status/storage presentation, assignment of items to requirement buckets + step summary text

**Modified**

- `src/api/types.ts` — `EvidenceSchema` extended (`runbook_step_id`, `qc_status`, `exif_metadata`, `upload_error`, `azure_blob_url`; `file_url` via `EvidenceFileUrlSchema`: http(s), `data:`, `mock:`, `blob:` — revisit when real storage adds other schemes)
- `src/lib/fieldAdapters.js` — upload token includes **`is_simulated_storage`** when using `mock://` URLs
- `src/components/fieldv2/EvidenceCaptureModal.jsx` — indeterminate “Saving…” flow, honest success/error/manifest toasts, **Save to job** CTA, type + optional runbook step + notes; manifest uses persisted **`record.file_url`**
- `src/components/fieldv2/EvidenceGalleryView.jsx` — requirements panel (**Add** per row, in-flight counts), grouping by requirement + **Other evidence**, status badges on thumbnails, detail **Upload/sync** + storage note, **`RunbookStepSummary`**
- `src/components/fieldv2/RunbookSteps.jsx` — passes **`job`** into **`EvidenceCaptureModal`** so step picker matches embedded phases when attaching from a step

**Out of scope (by design)**

- Shell, routing, **`telemetryQueue` / Azure** modules, real SAS/binary upload, and **`uploadQueue`** integration (see follow-ups below).

### Patch

**[`iteration-4-fieldjobdetail-evidence-trust.patch`](./iteration-4-fieldjobdetail-evidence-trust.patch)**

Re-run the command block below to refresh when Iteration 4 sources change. Last generated with:

```bash
git diff HEAD -- \
  src/api/types.ts \
  src/lib/fieldAdapters.js \
  src/components/fieldv2/EvidenceCaptureModal.jsx \
  src/components/fieldv2/EvidenceGalleryView.jsx \
  src/components/fieldv2/RunbookSteps.jsx

git diff --no-index /dev/null src/lib/fieldEvidenceViewModel.ts
```

(The final `git diff --no-index` hunk is for **`fieldEvidenceViewModel.ts`** when it is **untracked** on your branch; if it is already tracked, use `git diff HEAD -- src/lib/fieldEvidenceViewModel.ts` instead and merge hunks as needed.)

### How to use the patch

From the **repository root**, apply **after** Iterations 1–3 (or equivalent) so field v2 job detail and evidence components exist (Iteration 4 patch is separate):

```bash
git apply --check build-changes/iteration-4-fieldjobdetail-evidence-trust.patch
git apply build-changes/iteration-4-fieldjobdetail-evidence-trust.patch
```

`git apply --check` only succeeds when the **pre-patch** versions of the modified files match the patch context. If your tree already contains these edits, the check will fail by design—re-generate the patch from your branch or use `git apply --3way`.

### Follow-ups (evidence / storage, later iterations)

- Real **SAS + PUT** (or equivalent) with **`uploading` → `uploaded`** and persisted **`file_url`**
- **Offline / queue**: align capture with **`uploadQueue`** for local-only / awaiting-sync semantics
- **Single runbook source**: reconcile **`Runbook`** entity steps vs **`job.runbook_phases`** for step labels and capture defaults

### Technical debt (storage / API semantics)

- **`EvidenceCaptureModal`** still sends **`status: 'uploaded'`** on create because the current backend path expects it for “row saved”; it does **not** strictly mean “remote blob confirmed.” Marked **`TECHNICAL_DEBT`** in source; align enum + promotion with real upload when storage is wired.
- **`EvidenceFileUrlSchema`** may need another pass when signed or custom URL schemes appear beyond **`blob:`** (comment in `types.ts`).

---

## Iteration 5 — FieldJobDetail Comms + structured escalation

Canonical **Comms** tab is **three explicit zones in order** (numbered in UI + file header comment): (1) **Job coordination** — routine thread only; real `ChatMessage` by `job_id`; **`ChatView`** gets **`job`** for context strip, operational copy, send **`onError`**; copy states blockers do **not** belong here. (2) **Escalation / blocker** — persistent **amber** card (strong border/ring), heading + operational copy + **Report escalation** CTA; **Dialog** only wraps **`BlockerForm`** **`variant="comms"`** (`Blocker.create` + **`emitEscalationEvent`** / `blocker_create`). (3) **Meetings & context** — dashed, muted, lower-contrast block below. **`BlockerForm`**: comms toasts (**“Escalation saved for this job.”** / **“Notification sync may be delayed.”** when notify path fails after save).

### Changed file list

**New** (when the file was first added untracked — if **`JobCommsSection.jsx`** is already tracked on your branch, treat it as **Modified** and use `git diff HEAD` only)

- `src/components/fieldv2/JobCommsSection.jsx` — three numbered zones, header “Three parts” map, thread vs escalation vs meetings; persistent escalation card + **Dialog** + **`BlockerForm`**

**Modified**

- `src/components/field/ChatView.jsx` — optional **`job`** prop, job strip, operational strings, send **`onError`**; legacy callers unchanged (`jobId` only)
- `src/components/field/BlockerForm.jsx` — optional **`variant="comms"`** (copy + toasts only); same fields (category, severity, note, optional photo)

**Out of scope (by design)**

- Shell, **`telemetryQueue` / Azure** module edits, new **`escalation_source`** values, PM/AI **`Chat.jsx`** wiring into field-v2, evidence/runbook refactors.

### Patch

**[`iteration-5-fieldjobdetail-comms-escalation.patch`](./iteration-5-fieldjobdetail-comms-escalation.patch)**

Re-run the command block below to refresh when Iteration 5 sources change. Last generated with:

```bash
git diff HEAD -- \
  src/components/field/ChatView.jsx \
  src/components/field/BlockerForm.jsx

git diff --no-index /dev/null src/components/fieldv2/JobCommsSection.jsx
```

(Use the **`--no-index`** line only while **`JobCommsSection.jsx`** is **untracked**; once it is committed, use `git diff HEAD -- src/components/fieldv2/JobCommsSection.jsx` instead and merge hunks into one patch.)

### How to use the patch

From the **repository root**, apply **after** Iterations 1–4 (or equivalent) so field v2 job detail and shared field components exist:

```bash
git apply --check build-changes/iteration-5-fieldjobdetail-comms-escalation.patch
git apply build-changes/iteration-5-fieldjobdetail-comms-escalation.patch
```

`git apply --check` only succeeds when the **pre-patch** versions of the modified files match the patch context. If your tree already contains these edits, re-generate the patch from your branch or use `git apply --3way`.

### Follow-ups (addressed or deferred)

- **Iteration 6** aligned Comms/Overview/Closeout surfaces with shared **`fieldVisualTokens`** (see below); **`fj-blockers`** strip + read-only escalations list remain a **later** candidate.
- **`BlockerForm` / `createBlocker`** **`onError`** user-facing toast — still open.
- Optional **comms**-specific canonical event — only if product asks

---

## Iteration 6 — Canonical field visual system + enterprise polish

Shared **Tailwind class tokens** (`fieldVisualTokens`) and a small **`FieldSectionCard`** primitive unify spacing, typography (single **overline** scale), default **card** surfaces, **muted** / **warning** panels, and **CTA** / **tab** fragments across the canonical technician path. **Job list status** no longer duplicates lifecycle styling: **`FIELD_JOB_STATUS_DISPLAY`** extends **`LIFECYCLE_DISPLAY`** with **`qc_required`** / **`closed`** for list-only values; **`FieldJobs`** **`StatusBadge`** uses **`getFieldJobStatusDisplay`**. **FieldJobs** drops priority **emoji** in favor of text + neutral dots; **FieldJobDetail** header/meta/tabs and **fieldv2** sections consume the same rhythm so the flow reads as one product—**no** shell/nav redesign, **no** telemetry/Azure edits, **no** workflow rewrites.

### Token catalog (`src/lib/fieldVisualTokens.ts`)

| Constant | Role |
| -------- | ---- |
| **`FIELD_MAX_WIDTH`**, **`FIELD_PAGE_PAD_X`**, **`FIELD_PAGE_PAD_Y`** | Page column width and padding (aligned list + detail). |
| **`FIELD_STACK_GAP`**, **`FIELD_INNER_STACK`** | Vertical rhythm between major sections vs inside cards. |
| **`FIELD_OVERLINE`**, **`FIELD_OVERLINE_STRONG`** | Section eyebrows (10px, uppercase, slate). |
| **`FIELD_SECTION_TITLE`**, **`FIELD_BODY`**, **`FIELD_META`**, **`FIELD_META_MONO`** | In-card titles, body, secondary lines, mono IDs. |
| **`FIELD_CARD`**, **`FIELD_CARD_HEADER`**, **`FIELD_CARD_BODY`** | Default white card shell + titled header band + body padding. |
| **`FIELD_SURFACE_MUTED`**, **`FIELD_SURFACE_WARNING`** | Secondary dashed panels; escalation / strong attention (amber). |
| **`BTN_PRIMARY`**, **`BTN_SECONDARY`**, **`BTN_DANGER`** | Named CTA fragments (slate / outline / red). |
| **`FIELD_TAB_LABEL`**, **`FIELD_TAB_ACTIVE`**, **`FIELD_TAB_INACTIVE`** | Job detail segment tabs (sentence case; not the uppercase overline). |
| **`FIELD_CTRL_H`**, **`FIELD_BADGE_NEUTRAL`**, **`FIELD_BADGE_WARN`** | Control height; compact badges. |
| **`FIELD_LINK_PRIMARY`**, **`FIELD_LINK_SECONDARY`** | Text CTAs (e.g. Runbook/Evidence vs Closeout on Overview). |

### Patterns standardized

- **Status / lifecycle:** one map for list + detail pills (**`FIELD_JOB_STATUS_DISPLAY`** + **`LIFECYCLE_DISPLAY`** on Overview).
- **Cards / surfaces:** **`FIELD_CARD`** (+ **`FieldSectionCard`**) vs **`FIELD_SURFACE_MUTED`** / **`FIELD_SURFACE_WARNING`** for Comms zones and Closeout activity.
- **Overlines:** **`FIELD_OVERLINE`** (and tab **`FIELD_TAB_LABEL`**) replace mixed 9–10px **`font-black`** / **`tracking-widest`** sprawl in touched files.
- **CTAs:** shared **`rounded-xl`** + **`h-10`** where applied; primary slate / semantic blues/ambers kept for state-machine gating where required.

### Changed file list

**New**

- `src/lib/fieldVisualTokens.ts` — string constants only (Tailwind fragments).
- `src/components/fieldv2/FieldSectionCard.jsx` — optional titled section card (`default` \| `muted` \| `warning`).

**Modified**

- `src/lib/fieldJobExecutionModel.ts` — **`FIELD_JOB_STATUS_DISPLAY`**, **`FieldJobListStatus`**, **`getFieldJobStatusDisplay`** (extends **`LIFECYCLE_DISPLAY`**).
- `src/pages/FieldJobs.jsx` — tokens, unified status badge, non-emoji priority, Lucide date/assignee icons.
- `src/pages/FieldJobDetail.jsx` — token layout for sticky header, tabs, main stack.
- `src/components/fieldv2/JobOverview.jsx` — **`FieldSectionCard`**, tokens, primary vs secondary quick links.
- `src/components/fieldv2/JobStateTransitioner.jsx` — **`FIELD_CARD`**, **`FIELD_CTRL_H`**, **`FIELD_META`**, **`BTN_SECONDARY`** on override cancel; gating colors unchanged.
- `src/components/fieldv2/FieldTimeTracker.jsx` — **`FIELD_CARD`**, overline/body, badge + timer buttons.
- `src/components/fieldv2/RunbookSteps.jsx` — step cards, overlines, **`FIELD_CTRL_H`** actions.
- `src/components/fieldv2/EvidenceGalleryView.jsx` — requirements panel, headers, detail actions via tokens.
- `src/components/fieldv2/JobCloseoutSection.jsx` — overlines, **`FIELD_CARD`**, muted activity block.
- `src/components/fieldv2/JobCommsSection.jsx` — **`FIELD_SURFACE_*`**, **`FIELD_CARD`**, typography alignment with tokens (three zones unchanged in order).
- `src/components/fieldv2/OfflineEditsIndicator.jsx` / **`UploadProgressIndicator.jsx`** — radius/border/shadow + token meta/body where used.
- `src/components/fieldv2/PreJobToolCheckModal.jsx` — token pass on panels/headers only (technical **`code`** copy preserved).

**Out of scope (by design)**

- `Layout.jsx` / global nav, **`telemetryQueue`** / Azure modules, theme-wide Tailwind reset, legacy non-canonical pages (**`JobDetail.jsx`**, **`Chat.jsx`**, etc.), global **`button.tsx`** / shadcn defaults (avoided unless unavoidable).

### Patch

**[`iteration-6-canonical-field-visual-system.patch`](./iteration-6-canonical-field-visual-system.patch)**

Re-run the command block below to refresh when Iteration 6 sources change:

```bash
git diff HEAD -- \
  src/lib/fieldJobExecutionModel.ts \
  src/pages/FieldJobs.jsx \
  src/pages/FieldJobDetail.jsx \
  src/components/fieldv2/JobOverview.jsx \
  src/components/fieldv2/JobStateTransitioner.jsx \
  src/components/fieldv2/FieldTimeTracker.jsx \
  src/components/fieldv2/RunbookSteps.jsx \
  src/components/fieldv2/EvidenceGalleryView.jsx \
  src/components/fieldv2/JobCloseoutSection.jsx \
  src/components/fieldv2/JobCommsSection.jsx \
  src/components/fieldv2/OfflineEditsIndicator.jsx \
  src/components/fieldv2/UploadProgressIndicator.jsx \
  src/components/fieldv2/PreJobToolCheckModal.jsx

git diff --no-index /dev/null src/lib/fieldVisualTokens.ts
git diff --no-index /dev/null src/components/fieldv2/FieldSectionCard.jsx
```

(Use the two **`--no-index`** lines only while **`fieldVisualTokens.ts`** / **`FieldSectionCard.jsx`** are **untracked**; once committed, use `git diff HEAD -- <paths>` for those files instead and merge into one patch.)

### How to use the patch

From the **repository root**, apply **after** Iterations 1–5 (or equivalent) so canonical pages and field v2 components exist:

```bash
git apply --check build-changes/iteration-6-canonical-field-visual-system.patch
git apply build-changes/iteration-6-canonical-field-visual-system.patch
```

`git apply --check` only succeeds when the **pre-patch** versions of the modified files match the patch context. Re-generate or use `git apply --3way` if your tree has diverged.

### Deferred / Iteration 7 ideas

- Global theme, dark mode, animation polish, legacy pages.
- **`fj-blockers`** strip on job detail + read-only open escalations in Comms.
- Design tokens as CSS variables, reduced-motion preference, Storybook for field molecules, a11y contrast pass on amber/red panels.

---

## Adding future iterations

1. Create `iteration-N-<short-name>.patch` using a scoped `git diff` (and `git diff --no-index` for new files if needed).
2. Append a new section to this README with the file list and patch name.
