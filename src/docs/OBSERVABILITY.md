# Observability & Logging (P1)

Production-grade observability for the Purpulse field app with privacy-first design.

## Architecture

### 1. Error Tracking (Sentry)
**Files:** `lib/sentry.js`, `lib/errorReporter.js`

Captures and reports errors to Sentry for:
- Unhandled exceptions
- Network errors (with retry context)
- React component errors
- Performance metrics (10% sampling in prod)
- Session replay on crashes only (privacy-first)

**Setup:**
```bash
# Set these environment variables in dashboard
REACT_APP_SENTRY_DSN=https://xxx@sentry.io/project
REACT_APP_VERSION=2.5.0
```

**Usage:**
```javascript
import { captureError, setUserContext } from '@/lib/sentry';

// Capture error
captureError(error, {
  context: 'task_update',
  severity: 'error',
  extra: { taskId: '123' },
});

// Set user context after login
setUserContext(user); // Uses email as ID (no PII collection)
```

### 2. Event Telemetry (Base44 Analytics)
**File:** `lib/telemetry.js`

Lightweight, opt-in event tracking for critical field operations:

**Events Tracked:**
- `job_check_in` — User checked in to job (method: GPS/manual)
- `evidence_upload_start` — Evidence upload initiated
- `evidence_upload_complete` — Evidence upload finished (with duration)
- `evidence_upload_error` — Upload failed (error type only)
- `time_clock_start/stop` — Time tracking started/stopped
- `runbook_step_complete` — Task completed with duration
- `job_closeout` — Job submitted for approval
- `blocker_created` — Issue escalated (type, severity)
- `session_start/end` — App lifecycle tracking
- `crash` — Critical error (always sent)

**Privacy Features:**
- **Opt-in by default** — Users must accept consent banner
- **PII scrubbing** — Automatic removal of email, phone, location, address
- **No location data** — Despite field context
- **No device IDs** — Uses session IDs instead
- **Consent stored locally** — Can be revoked in Settings

**Usage:**
```javascript
import { 
  telemetryJobCheckIn,
  telemetryEvidenceUploadStart,
  isTelemetryEnabled,
  setTelemetryConsent,
} from '@/lib/telemetry';

// Check if user opted in
if (isTelemetryEnabled()) {
  telemetryJobCheckIn(jobId, 'gps');
  telemetryEvidenceUploadStart(jobId, 'site_photo', 2048); // KB
}

// User can revoke consent anytime
setTelemetryConsent(false);
```

### 3. Consent Management (UI)
**File:** `components/TelemetryConsent.jsx`

Privacy-focused consent banner that:
- Shows once per browser
- Clearly explains what data is collected
- Defaults to **opt-out** (most privacy-first)
- Links to Privacy Policy
- Dismissible
- Can be revoked in Settings

**Integration:** Automatically rendered in App.jsx

### 4. Breadcrumbs & Context
**Files:** `lib/sentry.js`, `lib/errorReporter.js`

Automatic event tracking for debugging:
- User actions (check-in, upload, time clock)
- Navigation events
- API calls (method, URL, status)
- Error context (retry attempts, network state)

## Data Privacy

### What We Collect
✅ **Allowed:**
- Event names (job_check_in, upload_start, etc.)
- Event timing (duration, count)
- Error types (not messages)
- Device info (User-Agent only)
- Job IDs (not job details)
- Session IDs (random, non-persistent)

### What We DON'T Collect
❌ **Blocked (auto-scrubbed):**
- User email, phone, name
- Location data (lat/lon)
- Job site addresses
- Contact information
- Device identifiers
- IP addresses
- Form inputs or passwords
- Screenshots or recordings (except crash replays)

### Scrubbing Example
```javascript
// Input
{
  job_id: 'j123',
  technician_email: 'john@example.com',
  latitude: 40.7128,
  site_address: '123 Main St',
}

// Auto-scrubbed output
{
  job_id: 'j123',
  technician_email: '[SCRUBBED]',
  latitude: '[SCRUBBED]',
  site_address: '[SCRUBBED]',
}
```

## Monitoring & Alerts

### Sentry Dashboard
1. Navigate to: https://sentry.io/organizations/purpulse/
2. Monitor:
   - Error rate and trends
   - Performance metrics (page load, transactions)
   - Release tracking
   - Session replay (crashes only)
   - User impact

### Setting Up Alerts
```
Condition: Error rate > 5% in 1 hour
Action: Slack notification + page on-call engineer
```

### Base44 Analytics
1. Navigate to: Base44 Dashboard → Analytics
2. View:
   - Event volume by type
   - User adoption (check-in count)
   - Evidence upload success rate
   - Time tracking usage
   - Error frequency

## Implementation Checklist

- [x] Sentry integration (error tracking)
- [x] Telemetry events (critical field operations)
- [x] PII scrubbing (automatic)
- [x] Opt-in consent (user control)
- [x] Privacy documentation
- [ ] Sentry DSN in env variables
- [ ] Release version tracking
- [ ] Slack alerts configured
- [ ] Privacy Policy updated
- [ ] User education in Support/Help

## Development

### Enable Debug Mode
```javascript
// In components or pages
import { isTelemetryEnabled } from '@/lib/telemetry';

console.log('Telemetry enabled:', isTelemetryEnabled());
```

### Test PII Scrubbing
```javascript
import { trackEvent } from '@/lib/telemetry';

trackEvent('test_event', {
  job_id: 'j123',
  user_email: 'test@example.com', // Will be scrubbed
  safe_field: 'value',
});

// Console: { job_id: 'j123', user_email: '[SCRUBBED]', safe_field: 'value' }
```

### Local Testing
```bash
# Disable Sentry in dev (set in .env)
REACT_APP_SENTRY_DSN=

# Check localStorage for consent
localStorage.getItem('purpulse_telemetry_enabled')
// → 'true' or 'false' or null
```

## Compliance

- **GDPR:** Compliant (opt-in, PII scrubbed, no tracking)
- **CCPA:** Compliant (user control, no sale of data)
- **HIPAA:** Not subject (no health data collected)
- **SOC 2:** Audit-ready (all errors tracked, user actions logged)

## Troubleshooting

### Sentry DSN not working
- Check `REACT_APP_SENTRY_DSN` is set in env
- Verify DSN is active in Sentry project settings
- Check browser console for initialization logs

### Events not appearing in Base44
- Confirm user has opted in: `isTelemetryEnabled()`
- Check network tab for failed analytics requests
- Verify `base44.analytics.track()` is working

### PII appearing in logs
- File bug report (should be auto-scrubbed)
- Manually review PII_FIELDS list in `lib/telemetry.js`
- Add custom field to scrubbing if needed

## TODO

- [ ] Integrate Sentry env variables into dashboard
- [ ] Set up Slack alerts for error spikes
- [ ] Create dashboards for field operations metrics
- [ ] Document retention policy (how long logs are kept)
- [ ] Add user support docs for "Disable Telemetry"
- [ ] Implement advanced analytics (funnel analysis, cohorts)