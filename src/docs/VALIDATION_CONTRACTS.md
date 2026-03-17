# Data Validation & Contract Enforcement

## Overview

Purpulse field app implements **runtime validation** for all critical entity types using **Zod schemas**. This prevents runtime crashes from malformed or inconsistent API responses, especially on mobile devices with poor network conditions.

## Architecture

### Three Layers

1. **Type Definitions** (`lib/types/index.ts`)
   - TypeScript interfaces for all entities (Job, Evidence, Activity, etc.)
   - Adapter interfaces for pluggable backends
   - Ensures IDE type checking and documentation

2. **Validation Schemas** (`lib/validation/schemas.ts`)
   - Zod schemas mirroring type definitions
   - Enforce required fields, enum values, data types
   - Coerce invalid data gracefully

3. **Validator Utilities** (`lib/validation/validator.ts`)
   - Safe validation wrappers for adapters
   - Batch validation for arrays
   - Safe fallback handling

### Adapter Integration

All adapters in `lib/fieldAdapters.js` validate responses **before returning**:

```typescript
// Before: raw data returned to components
const jobs = await adapter.listJobs();

// After: validated data, invalid items filtered
const jobs = await adapter.listJobs(); // → validateJobs() → validated[]
```

## Entities & Schemas

### Job

```typescript
// Type
interface Job {
  id: string;                    // Required
  title: string;                 // Required
  status: JobStatus;             // Required enum
  priority?: JobPriority;        // Optional enum
  scheduled_date?: string;       // Optional ISO string
  site_lat?: number;
  site_lon?: number;
  // ... 20+ more fields
}

// Validation
const result = validateJob(data);
if (result.success) {
  const job: Job = result.data;
  // Job is guaranteed safe
}
```

**Guaranteed Contract:**
- `id`, `title`, `status` always present
- `status` is one of: `assigned`, `en_route`, `checked_in`, `in_progress`, `paused`, `pending_closeout`, `submitted`, `approved`, `rejected`, `qc_required`, `closed`
- Optional fields typed as `T?`
- Geographic coordinates are numbers (not strings)

### Evidence

```typescript
interface Evidence {
  id: string;
  job_id: string;
  evidence_type: EvidenceType; // Required enum
  status: 'pending_upload' | 'uploading' | 'uploaded' | 'error' | 'replaced';
  file_url?: string;
  exif_metadata?: ExifData;
  geo_lat?: number;
  geo_lon?: number;
  quality_score?: number;      // 0-100
  // ...
}
```

**Guaranteed Contract:**
- `id`, `job_id`, `evidence_type`, `status` always present
- `exif_metadata` validated as object with optional numeric fields
- `quality_score` clamped to 0-100 if present
- File URLs are valid URLs (if present)

### Activity, TimeEntry, Blocker, etc.

Similar contracts. See `lib/validation/schemas.ts` for all 8 entity types.

## Usage Patterns

### 1. Validate Single Item

```typescript
import { validateJob } from '@/lib/validation/validator';

async function loadJob(id: string) {
  const result = validateJob(rawData);
  if (result.success) {
    setJob(result.data); // Type-safe
  } else {
    console.error('Job validation failed:', result.errors);
    setError('Invalid job data from server');
  }
}
```

### 2. Validate with Fallback

```typescript
import { validateJobOrFallback } from '@/lib/validation/validator';

const job = validateJobOrFallback(apiResponse, {
  id: 'unknown',
  title: 'Error Loading Job',
  status: 'assigned',
});
// Job is always valid Job type
```

### 3. Validate Arrays

```typescript
import { validateJobs } from '@/lib/validation/validator';

async function loadJobs() {
  const allJobs = await api.listJobs();
  const validJobs = validateJobs(allJobs);
  // Invalid items filtered out
  // Console logs: "Filtered 2 invalid job records"
  return validJobs;
}
```

### 4. Custom Validation

```typescript
import { validate } from '@/lib/validation/validator';
import { JobSchema } from '@/lib/validation/schemas';

const result = validate(JobSchema, unknownData, 'Custom Job Load');
if (result.success) {
  // Use result.data
} else {
  // Log result.errors: { 'status': 'Invalid enum value', ... }
}
```

## Adapter Validation

All adapters validate responses automatically:

```typescript
// fieldAdapters.js
export class Base44JobsAdapter {
  async listJobs() {
    try {
      const data = await base44.entities.Job.list(...);
      const validated = validateJobs(data);
      if (validated.length < data.length) {
        console.warn(`Filtered ${data.length - validated.length} invalid job records`);
      }
      return validated; // ← Always returns safe data
    } catch (err) {
      console.error('listJobs failed:', err);
      return []; // ← Safe fallback
    }
  }
}
```

**Key Benefits:**
- Components never receive invalid data
- Errors logged with context (`[Jobs]` prefix)
- Graceful degradation on network errors
- Audit logs written on failures

## Error Handling

### Validation Fails → Info Logged

```
[Validation] Job validation failed:
  {
    "status": "Invalid enum value. Expected one of: assigned, en_route, checked_in, ...",
    "priority": "Expected 'low' | 'medium' | 'high' | 'urgent', received 'URGENT'"
  }
[Jobs] Filtered 1 invalid job records
```

### Adapter Fails → Audit Logged

```typescript
// fieldAdapters.js
await writeAudit({
  action_type: 'admin_bulk_action',
  result: 'error',
  error_message: 'Network timeout',
  duration_ms: 4500,
});
```

## Testing Validation

### Unit Test Example

```typescript
import { validateJob } from '@/lib/validation/validator';

describe('Job Validation', () => {
  test('accepts valid job', () => {
    const result = validateJob({
      id: '123',
      title: 'Fix HVAC',
      status: 'in_progress',
    });
    expect(result.success).toBe(true);
    expect(result.data.status).toBe('in_progress');
  });

  test('rejects invalid status', () => {
    const result = validateJob({
      id: '123',
      title: 'Fix HVAC',
      status: 'INVALID',
    });
    expect(result.success).toBe(false);
    expect(result.errors?.status).toContain('Invalid enum value');
  });

  test('coerces string to number for lat/lon', () => {
    const result = validateJob({
      id: '123',
      title: 'Fix HVAC',
      status: 'assigned',
      site_lat: '40.7128', // string → coerced to number
    });
    expect(result.success).toBe(true);
    expect(typeof result.data.site_lat).toBe('number');
  });
});
```

## Migration Path

### Phase 1 (Current)
- ✓ Type definitions in place
- ✓ Zod schemas created
- ✓ Validators exported
- ✓ Adapters use validation

### Phase 2 (Optional)
- Convert components to TypeScript
- Import types at component level
- Remove `propTypes` in favor of TS interfaces

### Phase 3 (Optional)
- Enable TypeScript strict mode
- ESLint rules for type safety
- Pre-commit hooks for type checking

## FAQ

**Q: Does validation impact performance?**
A: Minimal. Zod parsing is O(n) fields, typically <1ms per record. Validation only runs on adapter responses, not on every render.

**Q: What if adapter returns completely invalid data?**
A: Validation catches it, logs the error, and returns a safe fallback (empty array or null). Components handle gracefully.

**Q: Can I disable validation?**
A: Not recommended. Validation is part of the contract layer. If you need to bypass it, write to console first: this indicates a real API problem that should be fixed.

**Q: How do I add new fields to a schema?**
A: 1. Update `Job` interface in `lib/types/index.ts`
2. Update `JobSchema` in `lib/validation/schemas.ts`
3. Update adapter response handling if needed

**Q: What about custom validators?**
A: Use `validate()` with custom Zod schemas. Example in "Custom Validation" section above.

## Checklist

- [ ] All adapters validate responses before returning
- [ ] Components receive guaranteed-safe data
- [ ] Validation errors logged with context
- [ ] Mobile network failures handled gracefully
- [ ] Unit tests cover validation edge cases
- [ ] Audit logs record adapter failures

## References

- Zod Docs: https://zod.dev
- TypeScript Handbook: https://www.typescriptlang.org/docs
- Entity Schemas: `docs/ENTITY_SPECS.md` (if exists)