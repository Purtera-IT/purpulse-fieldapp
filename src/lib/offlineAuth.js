/**
 * offlineAuth.js — Offline credential fallback for read-only access
 * 
 * When token is invalid but device has cached user and offline mode is allowed,
 * permits read-only access to cached data.
 * 
 * Enables graceful degradation on poor network conditions.
 */

const OFFLINE_USER_KEY = 'base44_offline_user_cache';
const OFFLINE_MODE_ALLOWED_KEY = 'base44_offline_mode_enabled';

/**
 * Cache current user for offline access
 */
export const cacheUserForOffline = (user) => {
  if (!user) return;
  try {
    localStorage.setItem(
      OFFLINE_USER_KEY,
      JSON.stringify({
        ...user,
        cached_at: new Date().toISOString(),
      })
    );
  } catch (err) {
    console.warn('[Offline] Failed to cache user:', err);
  }
};

/**
 * Get cached user (if available and app permits offline mode)
 */
export const getCachedUserForOffline = () => {
  if (!isOfflineModeAllowed()) return null;

  try {
    const cached = localStorage.getItem(OFFLINE_USER_KEY);
    if (!cached) return null;

    const user = JSON.parse(cached);
    const cacheAgeMs = Date.now() - new Date(user.cached_at).getTime();
    const maxAgeMs = 24 * 60 * 60 * 1000; // 24 hours

    if (cacheAgeMs > maxAgeMs) {
      console.warn('[Offline] User cache expired, clearing');
      clearOfflineCache();
      return null;
    }

    return user;
  } catch (err) {
    console.error('[Offline] Failed to parse cached user:', err);
    clearOfflineCache();
    return null;
  }
};

/**
 * Check if offline mode is allowed by app config
 */
export const isOfflineModeAllowed = () => {
  try {
    return localStorage.getItem(OFFLINE_MODE_ALLOWED_KEY) === 'true';
  } catch {
    return false;
  }
};

/**
 * Set offline mode permission (typically from appPublicSettings)
 */
export const setOfflineModeAllowed = (allowed) => {
  try {
    if (allowed) {
      localStorage.setItem(OFFLINE_MODE_ALLOWED_KEY, 'true');
    } else {
      localStorage.removeItem(OFFLINE_MODE_ALLOWED_KEY);
    }
  } catch (err) {
    console.warn('[Offline] Failed to set offline mode:', err);
  }
};

/**
 * Clear offline cache (call on logout)
 */
export const clearOfflineCache = () => {
  try {
    localStorage.removeItem(OFFLINE_USER_KEY);
  } catch (err) {
    console.warn('[Offline] Failed to clear cache:', err);
  }
};

/**
 * Get offline mode debug info
 */
export const getOfflineModeDebugInfo = () => ({
  allowed: isOfflineModeAllowed(),
  hasCachedUser: !!getCachedUserForOffline(),
  cacheTimestamp: (() => {
    try {
      const cached = localStorage.getItem(OFFLINE_USER_KEY);
      return cached ? JSON.parse(cached).cached_at : null;
    } catch {
      return null;
    }
  })(),
});