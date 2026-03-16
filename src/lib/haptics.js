/**
 * Haptic feedback utility — Purpulse
 *
 * Uses the Web Vibration API (available on Android Chrome; silently no-ops on iOS/desktop).
 * All patterns defined here to keep haptics consistent across the app.
 *
 * ──────────────────────────────────────────────────────────────────
 * HAPTIC PATTERN TABLE
 * ──────────────────────────────────────────────────────────────────
 *
 * Pattern name      Array (ms: vibrate, pause, vibrate…)   Use case
 * ─────────────     ────────────────────────────────────   ─────────────────────────────
 * tap               [10]                                   Generic button tap
 * capture           [30, 40, 30]                           Camera shutter / photo captured
 * success           [20, 60, 60]                           Timer started, sync ok, step complete
 * error             [80, 40, 80, 40, 80]                   Upload fail, sync error, validation fail
 * warning           [50, 60, 50]                           QC warning, offline, blocker reported
 * lock              [60, 30, 20]                           Time entry locked / approved
 * stop              [100]                                  Work session stopped
 * long_press        [15]                                   Long-press activation feedback
 * swipe_commit      [25, 20, 25]                           Swipe past commit threshold (job card)
 * ──────────────────────────────────────────────────────────────────
 */

const PATTERNS = {
  tap:          [10],
  capture:      [30, 40, 30],
  success:      [20, 60, 60],
  error:        [80, 40, 80, 40, 80],
  warning:      [50, 60, 50],
  lock:         [60, 30, 20],
  stop:         [100],
  long_press:   [15],
  swipe_commit: [25, 20, 25],
};

/**
 * Trigger a named haptic pattern.
 * @param {'tap'|'capture'|'success'|'error'|'warning'|'lock'|'stop'|'long_press'|'swipe_commit'} name
 */
export function haptic(name) {
  if (typeof window === 'undefined') return;
  // Respect prefers-reduced-motion — if user reduces motion, skip haptics too
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
  const pattern = PATTERNS[name];
  if (!pattern) return;
  try {
    navigator.vibrate?.(pattern);
  } catch {
    // Silently ignore — not all browsers support Vibration API
  }
}

export default haptic;