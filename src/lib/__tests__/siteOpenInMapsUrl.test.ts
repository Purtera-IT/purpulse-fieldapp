import { describe, it, expect } from 'vitest';
import {
  parseSiteCoordinate,
  buildSiteOpenInMapsUrl,
  jobHasSiteCoordinates,
} from '@/lib/siteOpenInMapsUrl';

describe('parseSiteCoordinate', () => {
  it('parses finite numbers', () => {
    expect(parseSiteCoordinate(40.7128)).toBe(40.7128);
    expect(parseSiteCoordinate(-74.006)).toBe(-74.006);
  });
  it('parses numeric strings', () => {
    expect(parseSiteCoordinate('37.7749')).toBe(37.7749);
  });
  it('returns null for invalid', () => {
    expect(parseSiteCoordinate(null)).toBeNull();
    expect(parseSiteCoordinate('')).toBeNull();
    expect(parseSiteCoordinate(NaN)).toBeNull();
    expect(parseSiteCoordinate('x')).toBeNull();
  });
});

describe('buildSiteOpenInMapsUrl', () => {
  it('prefers coordinates when both present', () => {
    const url = buildSiteOpenInMapsUrl({
      site_lat: 40.1,
      site_lon: -74.2,
      site_address: '123 Main St',
    });
    expect(url).toBe('https://maps.google.com/maps?q=40.1,-74.2');
  });

  it('uses coordinates from string coords', () => {
    expect(buildSiteOpenInMapsUrl({ site_lat: '40.1', site_lon: '-74.2' })).toBe(
      'https://maps.google.com/maps?q=40.1,-74.2'
    );
  });

  it('falls back to address when coords incomplete', () => {
    expect(
      buildSiteOpenInMapsUrl({ site_lat: 40.1, site_address: '99 Oak Ave' })
    ).toBe('https://maps.google.com/maps?q=' + encodeURIComponent('99 Oak Ave'));
  });

  it('uses address only when no coords', () => {
    expect(buildSiteOpenInMapsUrl({ site_address: 'Boston, MA' })).toBe(
      'https://maps.google.com/maps?q=' + encodeURIComponent('Boston, MA')
    );
  });

  it('trims address', () => {
    expect(buildSiteOpenInMapsUrl({ site_address: '  x  ' })).toBe(
      'https://maps.google.com/maps?q=' + encodeURIComponent('x')
    );
  });

  it('returns null when nothing usable', () => {
    expect(buildSiteOpenInMapsUrl({})).toBeNull();
    expect(buildSiteOpenInMapsUrl({ site_address: '   ' })).toBeNull();
    expect(buildSiteOpenInMapsUrl(null)).toBeNull();
  });
});

describe('jobHasSiteCoordinates', () => {
  it('true when both coords valid', () => {
    expect(jobHasSiteCoordinates({ site_lat: 1, site_lon: 2 })).toBe(true);
  });
  it('false when one missing', () => {
    expect(jobHasSiteCoordinates({ site_lat: 1 })).toBe(false);
  });
});
