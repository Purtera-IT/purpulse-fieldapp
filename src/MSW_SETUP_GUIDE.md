# MSW (Mock Service Worker) Setup Guide

## Overview

MSW provides request mocking at the network layer, allowing UI developers to iterate without a real backend. The setup includes:

✅ **4 mock scenarios** — Success, Slow network, Server errors, Offline
✅ **Realistic fixtures** — Jobs, technicians, evidence with geolocation
✅ **Dev-only toggle** — Switch scenarios in AdminDevPanel without reload
✅ **Zero code changes** — Uses same API client, MSW intercepts requests

## Files Created

### Fixtures
- `src/mocks/fixtures/jobs.json` — 3 mock jobs with full metadata
- `src/mocks/fixtures/technicians.json` — 2 mock technicians
- `src/mocks/fixtures/assets.json` — Evidence/photos with EXIF data

### Handlers & Setup
- `src/mocks/handlers.ts` — HTTP handlers for all API endpoints, scenario logic
- `src/mocks/browser.ts` — MSW worker for browser/dev environments
- `src/mocks/server.ts` — MSW server for Node/Storybook environments
- `src/mocks/index.ts` — Export public API

### Integration
- `src/main.jsx` — Auto-initializes MSW in development
- `src/api/client.ts` — Updated to use `/api` baseURL in dev, falls back to real backend in prod
- `src/pages/AdminDevPanel.jsx` — Scenario switching UI

## How It Works

### 1. **Request Interception**
When `npm run dev` starts, MSW installs a service worker that intercepts all API requests:

```
User Request → MSW Worker → Handler Logic → Mock Response
                (intercepts)  (delays, errors) (fixtures)
```

### 2. **Scenario Switching**
The `AdminDevPanel` provides 4 scenario buttons. Clicking a button calls:

```typescript
import { setMockScenario } from '@/mocks/handlers';
setMockScenario('slow'); // Switch to slow network
```

This updates global state that handlers check before responding.

### 3. **APIClient Integration**
The `APIClient` now routes to MSW in dev:

```typescript
// src/api/client.ts
const baseURL = process.env.NODE_ENV === 'development'
  ? '/api'  // ← Routes to MSW
  : process.env.REACT_APP_API_BASE_URL  // ← Real backend in prod
```

## Usage

### Running the App
```bash
npm run dev
# MSW auto-initializes, intercepts all requests
```

### Switching Mock Scenarios
1. Navigate to **AdminDevPanel** (`/AdminDevPanel`)
2. Scroll to **MSW Mock Scenarios** section
3. Click a scenario button:
   - **Success** — 100ms responses, normal operation
   - **Slow Network** — 3s delay to test loading states
   - **Server Error** — 500 responses to test error handling
   - **Offline** — Network failures, test retry logic

### Manual Console Control
```javascript
// In browser console
import { setMockScenario } from '@/mocks/handlers';
setMockScenario('slow');
setMockScenario('error');
setMockScenario('offline');
setMockScenario('success');
```

## Available Endpoints

### Jobs
```
GET /api/jobs
GET /api/jobs/:id
```

### Evidence/Assets
```
GET /api/jobs/:id/evidence
POST /api/jobs/:id/evidence (upload)
```

### Technicians
```
GET /api/technicians
```

### Sync & Auth
```
POST /api/sync
POST /api/auth/login
POST /api/auth/logout
```

## Scenario Behavior

### Success (Default)
```typescript
delay: 100ms
responses: normal (status 200)
use case: development, feature iteration
```

### Slow Network
```typescript
delay: 3000ms
responses: normal (status 200)
use case: test loading states, spinners, skeleton screens
```

### Server Error
```typescript
delay: 100ms
responses: 404 or 500 errors
use case: test error boundaries, retry logic, fallbacks
```

### Offline
```typescript
throws: Network error
use case: test offline mode, sync queues, reconnection
```

## Fixtures

### Job Schema
- `id`, `external_id` — Identifiers
- `title`, `description` — Display text
- `status` — assigned | en_route | checked_in | in_progress | pending_closeout | approved
- `priority` — low | medium | high | urgent
- `scheduled_date`, `scheduled_time` — Dates (ISO 8601)
- `site_*` — Location data (lat/lon, address)
- `assigned_to` — Technician email
- `sync_status` — synced | pending | error

### Evidence/Asset Schema
- `job_id`, `evidence_type` — Link to job
- `file_url`, `thumbnail_url` — Media URLs
- `exif_metadata` — Camera data (ISO, focal length, etc.)
- `geo_lat`, `geo_lon`, `geo_accuracy_m` — GPS coordinates
- `quality_score` — 0–100 rating
- `approved_for_training` — ML dataset flag

## Adding More Fixtures

To add more jobs/evidence:

1. Edit `src/mocks/fixtures/jobs.json`:
```json
{
  "id": "job-004",
  "external_id": "WO-2026-004",
  "title": "New Job",
  ...
}
```

2. Edit `src/mocks/fixtures/assets.json`:
```json
{
  "id": "asset-003",
  "job_id": "job-004",
  "evidence_type": "site_photo",
  ...
}
```

3. Handlers automatically load updated fixtures on reload.

## Testing Locally

### 1. Test Success Scenario
```bash
npm run dev
# Navigate to FieldJobs
# Should see 3 jobs instantly
```

### 2. Test Slow Network
```bash
npm run dev
# AdminDevPanel → Slow Network
# Navigate to FieldJobs
# Should see 3s loading delay + spinner
```

### 3. Test Error Scenario
```bash
npm run dev
# AdminDevPanel → Server Error
# Navigate to FieldJobs
# Should show error boundary / retry UI
```

### 4. Test Offline
```bash
npm run dev
# AdminDevPanel → Offline
# Navigate to FieldJobs
# Should show network error + offline UI
```

## Storybook Integration

MSW also runs in Storybook. To test a component with mock data:

```typescript
// MyComponent.stories.jsx
import { handlers } from '@/mocks/handlers';
import { setMockScenario } from '@/mocks/handlers';

export default {
  title: 'Components/JobCard',
  component: JobCard,
  decorators: [
    (Story) => {
      setMockScenario('slow'); // Test loading state
      return <Story />;
    },
  ],
};

export const Default = {
  args: { jobId: 'job-001' },
};
```

## Troubleshooting

### MSW Not Intercepting Requests
1. Check browser console for MSW startup message
2. Verify network requests show `[MSW]` tag
3. Restart `npm run dev`

### Scenario Not Switching
1. Ensure AdminDevPanel is accessible
2. Check browser console for errors
3. Manual fallback: `setMockScenario('success')` in console

### Fixtures Not Updating
1. Clear browser cache
2. Restart dev server
3. Check JSON syntax in fixture files

## Next Steps

- Add fixtures for more complex scenarios
- Extend handlers for additional endpoints (labels, meetings, etc.)
- Create Storybook stories for all components using MSW
- Document API contract in OpenAPI/Swagger format

## References

- [MSW Documentation](https://mswjs.io/)
- [Fixture Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
- `src/mocks/handlers.ts` — Full handler implementations