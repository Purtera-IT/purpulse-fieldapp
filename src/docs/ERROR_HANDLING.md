# Error Handling Strategy

This document outlines the centralized error handling approach for the Purpulse field application.

## Architecture

### 1. Error Boundary (React)
**File:** `components/ErrorBoundary.jsx`

Catches unhandled React errors and displays a friendly recovery UI with:
- User-friendly error message
- Retry button
- Copy error details (for support)
- Developer details (dev mode only)
- APM reporting (Sentry integration placeholder)

**Usage:** Already wrapped at app root in `App.jsx`

### 2. Error Reporter (APM)
**File:** `lib/errorReporter.js`

Centralized error logging for:
- React component errors
- Network failures
- Custom application errors
- Development logging

**Functions:**
- `reportError()` — Report general errors
- `reportNetworkError()` — Report API errors with context

### 3. Retry Policy (Network)
**File:** `lib/axiosRetry.js`

Automatic retry logic for failed API requests:
- **Retryable methods:** GET, PUT, DELETE, HEAD (idempotent)
- **Retryable status codes:** 408, 429, 500, 502, 503, 504
- **Strategy:** Exponential backoff with jitter
- **Max retries:** 3 attempts
- **Base delay:** 1s (doubles each retry + random jitter)

**Integration:** Automatically attached to axios instance via interceptor

### 4. Toast Notifications (UX)
**File:** `lib/errorToast.js`

Consistent error/success feedback using sonner:
- `showErrorToast()` — Display friendly error message
- `showSuccessToast()` — Display success confirmation
- `withErrorToast()` — Wrapper for async operations (auto error handling)
- `getErrorMessage()` — Map error status codes to friendly messages

**Usage:**
```javascript
import { withErrorToast } from '@/lib/errorToast';

// Automatic error handling + toast
await withErrorToast(
  base44.entities.Task.update(id, data),
  'Task updated successfully',
  { context: 'task_update' }
);
```

### 5. Optimistic Updates
**File:** `lib/useOptimisticUpdate.js`

React hook for optimistic UI updates with automatic rollback:
- **Only use for:** Small, idempotent operations
- **Requires:** Server-side idempotency guarantees (e.g., `client_request_id`)
- **Behavior:** Rollback on failure, auto error toast

**Usage:**
```javascript
import { useOptimisticUpdate } from '@/lib/useOptimisticUpdate';

const { data, execute } = useOptimisticUpdate(initialTask);

const handleComplete = async () => {
  await execute(
    { ...task, status: 'done' },                    // Optimistic data
    () => base44.entities.Task.update(task.id, { status: 'done' }),
    { successMessage: 'Task marked complete' }
  );
};
```

## Error Flow

```
User Action
    ↓
Try Operation (with toast loading indicator)
    ↓
Network Request (with retry interceptor)
    ↓
Success?
  ├─ Yes → showSuccessToast() → Update UI
  └─ No  → Retry 3x with exponential backoff
              ↓
              Success? → showSuccessToast()
              ↓
              Fail → showErrorToast() + reportNetworkError()
                     (User sees friendly message + retry option)
```

## Best Practices

### ✅ Do

- Use `withErrorToast()` for all API operations
- Use `useOptimisticUpdate()` for small, idempotent actions only
- Provide idempotency keys for critical mutations
- Test error paths in development
- Monitor Sentry dashboard for error trends
- Show user-friendly messages, not technical errors

### ❌ Don't

- Don't use optimistic updates without server-side idempotency
- Don't suppress errors silently
- Don't mix error handling patterns
- Don't retry non-idempotent operations (POST, PATCH)
- Don't show raw stack traces to users
- Don't report sensitive data in error logs

## Examples

### Basic API Call
```javascript
import { withErrorToast } from '@/lib/errorToast';

const handleUpdate = async () => {
  try {
    await withErrorToast(
      base44.entities.Job.update(jobId, { status: 'in_progress' }),
      'Job started'
    );
  } catch (error) {
    // Error already handled by withErrorToast
  }
};
```

### Optimistic Update
```javascript
import { useOptimisticUpdate } from '@/lib/useOptimisticUpdate';

function TaskCard({ task, onUpdate }) {
  const { data: current, execute } = useOptimisticUpdate(task);

  const handleComplete = () => {
    execute(
      { ...current, status: 'done' },
      () => base44.entities.Task.update(task.id, { status: 'done' }),
      {
        successMessage: '✓ Task completed',
        context: 'task_complete',
      }
    );
  };

  return (
    <button onClick={handleComplete}>
      {current.status === 'done' ? '✓ Done' : 'Mark Complete'}
    </button>
  );
}
```

### Custom Error Handling
```javascript
import { reportError } from '@/lib/errorReporter';
import { showErrorToast } from '@/lib/errorToast';

const handleCustomLogic = async () => {
  try {
    // Custom logic...
  } catch (error) {
    await reportError({
      error,
      context: 'custom_logic_failure',
      severity: 'warn',
      extra: { userId: user.id },
    });

    showErrorToast(error, {
      message: 'Custom error occurred',
      context: 'custom_logic',
    });
  }
};
```

## Monitoring & Debugging

### Development
- Check browser console for detailed error logs
- Inspect ErrorBoundary dev panel for stack traces
- Network tab shows retry attempts

### Production
- Monitor Sentry dashboard for error trends
- Check error categories, affected users, timeline
- Set up alerts for critical errors (5xx, auth failures)

## TODO: Sentry Integration

Replace placeholder APM calls in `lib/errorReporter.js`:

```javascript
import * as Sentry from '@sentry/react';

// Initialize in main.jsx
Sentry.init({
  dsn: process.env.REACT_APP_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1,
});

// In reportError()
Sentry.captureException(error, { level: severity, ...context });
```

## Testing

Test error paths:
- Network errors (offline, timeout)
- Server errors (500, 503)
- Validation errors (400, 422)
- Auth errors (401, 403)
- Optimistic update rollback

Use dev tools to simulate network failures or manually throw errors.