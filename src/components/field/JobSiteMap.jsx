/**
 * Iteration 5a / 16: embedded site map (static pin) + Open in Maps from work-order data only.
 * Uses react-leaflet; does not use live GPS — only job.site_lat / site_lon and/or site_address.
 */
import React, { useEffect } from 'react';
import L from 'leaflet';
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import { MapPin, Navigation, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  buildSiteOpenInMapsUrl,
  parseSiteCoordinate,
} from '@/lib/siteOpenInMapsUrl';

import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

let _iconsFixed = false;
function fixLeafletDefaultIcons() {
  if (_iconsFixed) return;
  _iconsFixed = true;
  delete L.Icon.Default.prototype._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: markerIcon2x,
    iconUrl: markerIcon,
    shadowUrl: markerShadow,
  });
}

/**
 * @param {Object} props
 * @param {Record<string, unknown>} props.job
 * @param {number} [props.height]
 * @param {string} [props.className]
 * @param {boolean} [props.dense]
 * @param {boolean} [props.scrollWheelZoom]
 */
export default function JobSiteMap({
  job,
  height = 220,
  className,
  dense = false,
  scrollWheelZoom = false,
}) {
  const lat = parseSiteCoordinate(job?.site_lat);
  const lon = parseSiteCoordinate(job?.site_lon);
  const hasCoords = lat != null && lon != null;
  const href = buildSiteOpenInMapsUrl(job);

  useEffect(() => {
    if (hasCoords) fixLeafletDefaultIcons();
  }, [hasCoords]);

  const openMapsBtn = href ? (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        'inline-flex items-center justify-center gap-1.5 rounded-[8px] bg-blue-600 text-white font-bold active:opacity-80',
        dense ? 'h-8 px-2.5 text-[10px]' : 'h-9 px-3 text-xs'
      )}
    >
      <Navigation className={cn(dense ? 'h-3 w-3' : 'h-3.5 w-3.5')} aria-hidden />
      Open in Maps
      <ExternalLink className={cn(dense ? 'h-2.5 w-2.5' : 'h-3 w-3')} aria-hidden />
    </a>
  ) : null;

  const footerLabel = job?.site_address || job?.site_name || null;
  const hasStreetAddress = Boolean(job?.site_address?.trim());
  const nameOnlyNoPin =
    !hasCoords && !hasStreetAddress && Boolean(job?.site_name?.trim());

  if (!hasCoords) {
    return (
      <div className={cn('rounded-xl border border-slate-200 bg-slate-50 overflow-hidden', className)}>
        <div className={cn('flex flex-col gap-3 p-4', dense && 'p-3 gap-2')}>
          <div className="flex items-start gap-2 text-slate-600">
            <MapPin className={cn('text-slate-400 flex-shrink-0 mt-0.5', dense ? 'h-4 w-4' : 'h-5 w-5')} />
            <div className="min-w-0 text-sm">
              <p className="text-xs text-slate-700 leading-snug font-medium">
                Site pin needs latitude/longitude on the job.
              </p>
              {footerLabel ? (
                <p className="text-xs text-slate-600 mt-1.5 leading-snug break-words">{footerLabel}</p>
              ) : null}
              {nameOnlyNoPin ? (
                <p className="text-[11px] text-slate-500 mt-1.5 leading-snug">
                  Add a site address on the work order to open directions.
                </p>
              ) : null}
            </div>
          </div>
          {openMapsBtn}
        </div>
      </div>
    );
  }

  const center = [lat, lon];

  return (
    <div className={cn('rounded-xl border border-slate-200 overflow-hidden bg-slate-100', className)}>
      <div
        className="relative w-full z-0"
        style={{ height }}
        role="region"
        aria-label={job?.site_name ? `Map of ${job.site_name}` : 'Job site map'}
      >
        <MapContainer
          center={center}
          zoom={15}
          className="h-full w-full z-0 [&_.leaflet-control-container]:z-[400]"
          scrollWheelZoom={scrollWheelZoom}
          dragging
          attributionControl
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <Marker position={center} />
        </MapContainer>
      </div>
      {(openMapsBtn || footerLabel) && (
        <div
          className={cn(
            'flex flex-wrap items-center gap-2 border-t border-slate-200 bg-white px-3 py-2',
            dense && 'px-2 py-1.5',
            footerLabel ? 'justify-between' : 'justify-end'
          )}
        >
          {footerLabel ? (
            <p
              className={cn(
                'text-slate-600 flex-1 min-w-0 line-clamp-2',
                dense ? 'text-[10px]' : 'text-xs'
              )}
              title={typeof footerLabel === 'string' ? footerLabel : undefined}
            >
              {footerLabel}
            </p>
          ) : null}
          {openMapsBtn}
        </div>
      )}
    </div>
  );
}
