/**
 * P0: build “open site in maps” URLs from work-order fields only (no device GPS).
 * Prefer coordinates when both are valid; else fall back to site_address text.
 */

/**
 * @param {unknown} v
 * @returns {number | null}
 */
export function parseSiteCoordinate(v) {
  if (v == null || v === '') return null;
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

/**
 * @param {Record<string, unknown> | null | undefined} job
 * @returns {string | null}
 */
export function buildSiteOpenInMapsUrl(job) {
  if (!job || typeof job !== 'object') return null;
  const lat = parseSiteCoordinate(job.site_lat);
  const lon = parseSiteCoordinate(job.site_lon);
  if (lat != null && lon != null) {
    return `https://maps.google.com/maps?q=${lat},${lon}`;
  }
  const addr = job.site_address;
  if (typeof addr === 'string' && addr.trim() !== '') {
    return `https://maps.google.com/maps?q=${encodeURIComponent(addr.trim())}`;
  }
  return null;
}

/**
 * @param {Record<string, unknown> | null | undefined} job
 * @returns {boolean}
 */
export function jobHasSiteCoordinates(job) {
  if (!job || typeof job !== 'object') return false;
  return (
    parseSiteCoordinate(job.site_lat) != null && parseSiteCoordinate(job.site_lon) != null
  );
}
