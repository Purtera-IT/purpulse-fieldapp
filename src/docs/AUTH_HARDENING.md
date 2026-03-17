# Authentication & Session Hardening

## Overview

Purpulse field app implements enterprise-grade auth with token refresh, axios interceptors, offline fallback, and centralized error handling.

## Architecture

### 1. Token Management (`lib/axiosInterceptor.js`)

**Problem:** Direct SDK calls don't automatically refresh expired tokens on 401 errors.

**Solution:** Centralized axios interceptor that:
- Attaches bearer token to all requests
- Retries on 401 with token refresh
- Queues requests during refresh to prevent race conditions
- Forces logout on refresh failure

```javascript
// Setup once on app init
setupAxiosInterceptors(axiosInstance);

// Now all requests get automatic token refresh on 401
const response = await axios.get('/api/jobs');
```

**Token Refresh Flow:**
```
Request → 401 Unauthorized
  ↓
isRefreshing = true
Call base44.auth.refreshToken()
  ↓
Success: Update localStorage token
Queue waiting requests
Retry original request
  ↓
isRefreshing = false
onRefreshed() → execute queued requests
```

### 2. Offline Fallback (`lib/offlineAuth.js`)

**Problem:** Poor network = user sees blank screen. Field techs need read-only access to cached data.

**Solution:** Graceful degradation:
- Cache authenticated user for 24 hours
- Check if offline mode is app-level config
- Fall back to cached user on token failure
- Allow read-only access with banner

```javascript
// In AuthContext.checkUserAuth()
try {
  const user = await base44.auth.me();
  setUser(user);
} catch (err) {
  const cached = getCachedUserForOffline();
  if (cached) {
    setUser(cached); // ← User can view cached data
    setAuthError({ type: 'offline_mode', message: 'Read-only' });
  }
}
```

**Cache Lifecycle:**
- Created: On successful auth
- Expires: 24 hours
- Cleared: On logout or auth error

### 3. Unified Error Boundary (`components/AuthErrorBoundary.jsx`)

**Problem:** Auth errors scattered across code, inconsistent UX.

**Solution:** Single error screen for all auth failures:

```
Session Expired
├─ Clear explanation
├─ Primary CTA: Log In
├─ Secondary CTA: Retry Connection
├─ Tertiary CTA: Continue Offline (if cached user)
└─ Debug Info toggle
```

**Error Types:**
- `auth_required`: Session expired, must login
- `user_not_registered`: Account not authorized
- `offline_mode`: Using cached data (read-only)
- `auth_error`: Generic auth failure

**In App.jsx:**
```jsx
if (authError?.type === 'auth_required' || authError?.type === 'auth_error') {
  return <AuthErrorBoundary />;
}
```

### 4. Environment Configuration (`.env.example`)

**Problem:** Secrets in code, leaked in repos.

**Solution:** Safe env var config:

```bash
# Copy template
cp .env.example .env.local

# Edit with your values
VITE_BASE44_APP_ID=your_app_id
VITE_ALLOW_URL_TOKEN=false  # Never true in production
VITE_ENABLE_OFFLINE_MODE=true
```

**Rules:**
- `VITE_*` = public, exposed to client (use for app IDs, URLs only)
- Never store API keys or passwords in VITE variables
- Sensitive config goes in backend .env only
- `.env.local` ignored by git (.gitignore)

## Usage

### Setup (App.jsx)

```jsx
import { setupAxiosInterceptors } from '@/lib/axiosInterceptor';
import axios from 'axios';

// Initialize once
useEffect(() => {
  setupAxiosInterceptors(axios.create());
}, []);
```

### AuthContext Flow

```javascript
checkAppState()
  → Fetch public settings
  → setOfflineModeAllowed(bool)
  → checkUserAuth()
    → Fetch user via base44.auth.me()
    → Cache user: cacheUserForOffline()
    → Set authenticated
    OR on 401:
      → Try offline fallback
      → Show error boundary
```

### Using Offline Data

Components check auth error to detect read-only mode:

```jsx
const { authError, user } = useAuth();
const isOfflineMode = authError?.type === 'offline_mode';

return (
  <div>
    {isOfflineMode && (
      <Banner warning>
        Offline mode — viewing cached data
      </Banner>
    )}
    <JobsList {...} />
  </div>
);
```

## Error Handling

### Token Refresh Fails

```
axios 401 → refresh attempt → fails
→ clearOfflineCache()
→ base44.auth.logout()
→ AuthErrorBoundary shows
```

### Network Timeout

```
App.checkAppState() → network error
→ Try getCachedUserForOffline()
→ If found: allow read-only
→ If not: show error boundary
```

### Offline Mode Disabled

```
App config has offline_mode_enabled: false
→ setOfflineModeAllowed(false)
→ Cached user cleared on logout
→ No offline fallback available
```

## Debugging

### Check Auth State

```javascript
import { useAuth } from '@/lib/AuthContext';

const { user, authError, isAuthenticated } = useAuth();
console.log({ user, authError, isAuthenticated });
```

### Check Token & Refresh Status

```javascript
import { getAuthDebugInfo } from '@/lib/axiosInterceptor';

console.log(getAuthDebugInfo());
// {
//   hasToken: true,
//   isRefreshing: false,
//   pendingRequests: 0,
//   timestamp: "2026-03-17T14:23:45.123Z"
// }
```

### Check Offline Mode

```javascript
import { getOfflineModeDebugInfo } from '@/lib/offlineAuth';

console.log(getOfflineModeDebugInfo());
// {
//   allowed: true,
//   hasCachedUser: true,
//   cacheTimestamp: "2026-03-17T13:45:12.456Z"
// }
```

## Security Checklist

- [ ] `VITE_ALLOW_URL_TOKEN=false` in production builds
- [ ] No API keys in .env.example
- [ ] .env.local in .gitignore
- [ ] Token stored only in localStorage (HttpOnly not feasible in React SPA)
- [ ] HTTPS enforced in production
- [ ] Token refresh endpoint is authenticated
- [ ] Logout clears all cached data
- [ ] Offline mode read-only (no writes to cached data)
- [ ] Error boundaries don't leak sensitive info
- [ ] Debug mode disabled in production

## Testing

### Mock Token Refresh

```javascript
// Override base44.auth.refreshToken for testing
const originalRefresh = base44.auth.refreshToken;
base44.auth.refreshToken = async () => {
  localStorage.setItem('base44_access_token', 'new_token_123');
};
```

### Test Offline Fallback

```javascript
// Simulate failed auth
const { result } = renderHook(() => useAuth(), {
  wrapper: AuthProvider
});

// Manually set cached user
cacheUserForOffline({ id: '123', email: 'test@example.com' });

// Auth check should fall back to cache
await act(async () => {
  await result.current.checkAppState();
});

expect(result.current.user.email).toBe('test@example.com');
```

## Migration Checklist

- [x] Created `lib/axiosInterceptor.js` with token refresh
- [x] Created `lib/offlineAuth.js` with cache management
- [x] Created `components/AuthErrorBoundary.jsx` with unified error UI
- [x] Updated `lib/AuthContext.jsx` with offline fallback
- [x] Updated `App.jsx` to show error boundary
- [x] Created `.env.example` with security guidance
- [ ] Setup CI/CD to validate no secrets in code
- [ ] Add pre-commit hook to check .env.local is ignored
- [ ] Document token refresh flow in runbooks
- [ ] Train team on offline mode behavior

## References

- Base44 Auth Docs: (internal)
- JWT Best Practices: https://tools.ietf.org/html/rfc8725
- OWASP Token Storage: https://owasp.org/www-community/vulnerabilities/Sensitive_Data_Exposure
- Axios Interceptors: https://axios-http.com/docs/interceptors