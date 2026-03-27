/**
 * PurPulse assignments API wiring: direct Azure URL (Vite build) vs Base44 server proxy (Secrets).
 * See base44/functions/purpulseAssignmentsProxy/entry.ts
 *
 * Base44 Secrets do not inject import.meta.env — when the SPA is served from *.base44.app and
 * VITE_AZURE_API_BASE_URL is absent, we default to same-origin proxy paths so production works
 * without bake-time VITE_USE_PURPULSE_ASSIGNMENTS_PROXY. Opt out with VITE_USE_ASSIGNMENTS_API=false.
 */

function trim(s: string | undefined): string {
  return typeof s === 'string' ? s.trim() : ''
}

/** True when the app is running on a Base44-hosted origin (production preview / deploy). */
export function isBase44AppHost(): boolean {
  if (typeof window === 'undefined') return false
  const h = window.location.hostname
  return h === 'base44.app' || h.endsWith('.base44.app')
}

function assignmentsApiExplicitlyDisabled(): boolean {
  return import.meta.env.VITE_USE_ASSIGNMENTS_API === 'false'
}

/** True when user wants PurPulse assignments (env or implicit Base44 deploy). */
function usePurpulseAssignmentsFeature(): boolean {
  if (assignmentsApiExplicitlyDisabled()) return false
  if (import.meta.env.VITE_USE_ASSIGNMENTS_API === 'true') return true
  return isBase44AppHost()
}

/** Use same-origin proxy to Azure (no VITE_AZURE_API_BASE_URL in bundle). */
function usePurpulseProxy(): boolean {
  if (trim(import.meta.env.VITE_AZURE_API_BASE_URL).length > 0) return false
  if (import.meta.env.VITE_USE_PURPULSE_ASSIGNMENTS_PROXY === 'false') return false
  if (import.meta.env.VITE_USE_PURPULSE_ASSIGNMENTS_PROXY === 'true') return true
  return isBase44AppHost() && usePurpulseAssignmentsFeature()
}

/** True when jobs should load from GET /api/me + /api/assignments (direct or proxy). */
export function isPurpulseAssignmentsDataSource(): boolean {
  if (!usePurpulseAssignmentsFeature()) return false
  if (trim(import.meta.env.VITE_AZURE_API_BASE_URL).length > 0) return true
  return usePurpulseProxy()
}

/**
 * Full URL for browser fetch. Direct mode: https://api-test.../api/me.
 * Proxy mode: same-origin path e.g. /mock/api/purpulse/me (no host — use relative fetch).
 */
export function purpulseFetchUrl(pathAndQuery: string): string {
  const direct = trim(import.meta.env.VITE_AZURE_API_BASE_URL).replace(/\/$/, '')
  const pq = pathAndQuery.startsWith('/') ? pathAndQuery : `/${pathAndQuery}`

  if (direct) {
    return `${direct}${pq}`
  }

  if (usePurpulseProxy()) {
    const prefix = trim(import.meta.env.VITE_PURPULSE_PROXY_PATH) || '/mock/api/purpulse'
    const base = prefix.replace(/\/$/, '')
    if (pq.startsWith('/api/me')) return `${base}/me`
    if (pq.startsWith('/api/assignments')) {
      const q = pq.includes('?') ? pq.slice(pq.indexOf('?')) : ''
      return `${base}/assignments${q}`
    }
  }

  return ''
}
