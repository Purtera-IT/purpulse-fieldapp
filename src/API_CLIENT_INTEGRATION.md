# API Client Integration Guide

## Overview

Centralized API client adapter with typed DTOs, Zod validation, and automatic retry logic.

## Files Created

### 1. `src/api/types.ts`
TypeScript interfaces and Zod schemas for all major entities:
- **Job** — Work orders with status, priority, scheduling, location
- **Technician** — Field personnel with skills and certifications
- **Evidence** — Photos, documents, assets with geolocation
- **LabelRecord** — ML labels with confidence scoring
- **TimeEntry** — Work/break/travel tracking with approval workflow
- **Meeting** — Scheduled meetings with transcripts
- **AuthResponse** — Login response with user and token

All schemas include:
✅ Zod validators for runtime type safety
✅ Optional fields for flexible API responses
✅ Enums for fixed value sets
✅ Numeric ranges and string formats

### 2. `src/api/client.ts`
**APIClient** class with:

#### Features
- ✅ **Centralized HTTP client** — Typed methods for all entity operations
- ✅ **Automatic retry logic** — Exponential backoff with jitter (3 retries)
- ✅ **Response validation** — Zod parsing with fallback logging
- ✅ **Request/response logging** — Debug-level console output
- ✅ **Idempotency** — Only retries GET/HEAD/DELETE/PUT (safe methods)
- ✅ **Configurable retry policy** — Pass custom RetryConfig to constructor

#### Methods
```typescript
// Read operations (auto-retry on 5xx, 429, 408)
getJobs(): Promise<Job[]>
getJob(jobId: string): Promise<Job | null>
getTechnicians(): Promise<Technician[]>
getEvidence(jobId: string, limit?: number): Promise<Evidence[]>
getLabels(jobId: string, limit?: number): Promise<LabelRecord[]>
getTimeEntries(jobId: string, limit?: number): Promise<TimeEntry[]>
getMeetings(jobId: string, limit?: number): Promise<Meeting[]>

// Write operations (no auto-retry to prevent duplicates)
updateJobStatus(jobId: string, status: Job['status']): Promise<Job>
createTimeEntry(jobId: string, data: ...): Promise<TimeEntry>
createLabel(data: ...): Promise<LabelRecord>
```

#### Singleton Export
```typescript
export const apiClient = new APIClient()
```

## Integration in Pages

### FieldJobs (src/pages/FieldJobs.jsx)

**Before:**
```jsx
import { defaultAdapters } from '@/lib/fieldAdapters';

const { data: jobs = [], isLoading } = useQuery({
  queryKey: ['field-jobs'],
  queryFn: () => adapter.listJobs(),
});
```

**After:**
```jsx
import { apiClient } from '@/api/client';

const { data: jobs = [], isLoading } = useQuery({
  queryKey: ['field-jobs'],
  queryFn: () => apiClient.getJobs(),
});
```

### FieldJobDetail (src/pages/FieldJobDetail.jsx)

**Before:**
```jsx
import { base44 } from '@/api/base44Client';
import { defaultAdapters } from '@/lib/fieldAdapters';

const { data: job } = useQuery({
  queryFn: async () => {
    const r = await base44.entities.Job.filter({ id: jobId });
    return r[0] || null;
  },
});
```

**After:**
```jsx
import { apiClient } from '@/api/client';

const { data: job } = useQuery({
  queryFn: () => apiClient.getJob(jobId!),
});
```

## Usage Examples

### Fetch and validate jobs
```typescript
import { apiClient } from '@/api/client';

const jobs = await apiClient.getJobs();
// → Automatically retries on network errors
// → Validates each job against JobSchema
// → Returns typed Job[] array
```

### Handle validation failures gracefully
```typescript
// Zod validation errors are logged but don't throw
// Invalid responses are still returned (log-only mode)
const jobs = await apiClient.getJobs();
jobs.forEach(job => {
  // TypeScript knows job is Job type, even if partially validated
  console.log(job.title, job.status);
});
```

### Create time entries with retry
```typescript
const timeEntry = await apiClient.createTimeEntry(jobId, {
  entry_type: 'work_start',
  timestamp: new Date().toISOString(),
  source: 'app',
  sync_status: 'pending',
  locked: false,
});
```

### Customize retry behavior
```typescript
const strictClient = new APIClient({
  maxRetries: 5,
  initialDelayMs: 2000,
  maxDelayMs: 30000,
  backoffMultiplier: 1.5,
});
```

## Type Safety Features

### Inference from Zod schemas
```typescript
// JobSchema automatically infers Job type
export const JobSchema = BaseEntity.extend({
  title: z.string(),
  status: z.enum([...]),
  ...
});
export type Job = z.infer<typeof JobSchema>;
```

### Component prop typing
```typescript
interface JobCardProps {
  job: Job; // ← Fully typed, IDE autocomplete works
}

const JobCard: React.FC<JobCardProps> = ({ job }) => (
  <div>{job.title}</div>
);
```

## Error Handling

### Retry logic
- Retries up to 3 times (configurable)
- Exponential backoff: 1s → 2s → 4s (+ random jitter)
- Only retries idempotent methods (GET, HEAD, DELETE, PUT)
- Logs each retry attempt to console

### Validation errors
- Zod validation failures are logged, not thrown
- Invalid fields are documented in console.error
- Response is still returned (fallback behavior)

### Network errors
- All network errors are retryable (treated as temporary)
- Logs final failure after max retries exhausted
- Throws original error to caller

## Next Steps

1. ✅ Replace remaining `base44.entities.*` calls with `apiClient` methods
2. ✅ Add error boundaries around API calls
3. ✅ Implement toast notifications for validation warnings
4. ✅ Add offline mode detection and queue retries
5. ✅ Extend client with remaining entity types (Activity, AuditLog, etc.)

## Benefits

✅ **Consistency** — All API calls use same retry/validation strategy
✅ **Type safety** — TypeScript inference + Zod validation
✅ **Observability** — Request/response logging built-in
✅ **Resilience** — Automatic retry with exponential backoff
✅ **Maintainability** — Single source of truth for API contracts