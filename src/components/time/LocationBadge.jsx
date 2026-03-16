/**
 * LocationBadge — live GPS geofence status chip.
 *
 * States: acquiring | on_site | off_site | unknown | denied | low_accuracy | disabled
 *
 * Emits onStatusChange({ state, job, distMeters, accuracy, lat, lon })
 * Emits onAlert(alertType) when alert-worthy conditions arise.
 */
import React, { useState, useEffect } from 'react';
import { MapPin, Navigation, Loader2, AlertTriangle, XCircle, ShieldOff } from 'lucide-react';
import { cn } from '@/lib/utils';

export const GEOFENCE_RADIUS_M  = 200;
const LOW_ACCURACY_THRESHOLD_M  = 50; // accuracy worse than 50m = warn

function haversineDistance(lat1, lon1, lat2, lon2) {
  const R  = 6371000;
  const φ1 = lat1 * Math.PI / 180, φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180, Δλ = (lon2 - lon1) * Math.PI / 180;
  const a  = Math.sin(Δφ/2)**2 + Math.cos(φ1)*Math.cos(φ2)*Math.sin(Δλ/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

const STATE_CFG = {
  acquiring:   { label: 'Locating…',       Icon: Loader2,       cls: 'text-slate-500',   bg: 'bg-slate-100 border-slate-200',    spin: true  },
  on_site:     { label: 'On-site',          Icon: Navigation,    cls: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-300', spin: false },
  off_site:    { label: 'Off-site',         Icon: MapPin,        cls: 'text-amber-700',   bg: 'bg-amber-50 border-amber-300',     spin: false },
  denied:      { label: 'Location denied',  Icon: XCircle,       cls: 'text-red-600',     bg: 'bg-red-50 border-red-200',         spin: false },
  limited:     { label: 'Limited GPS',      Icon: AlertTriangle, cls: 'text-amber-700',   bg: 'bg-amber-50 border-amber-300',     spin: false },
  low_accuracy:{ label: 'Low GPS accuracy', Icon: AlertTriangle, cls: 'text-amber-700',   bg: 'bg-amber-50 border-amber-300',     spin: false },
  disabled:    { label: 'Tracking off',     Icon: ShieldOff,     cls: 'text-slate-500',   bg: 'bg-slate-100 border-slate-200',    spin: false },
  unknown:     { label: 'No GPS',           Icon: XCircle,       cls: 'text-slate-500',   bg: 'bg-slate-100 border-slate-200',    spin: false },
};

export default function LocationBadge({ jobs = [], onStatusChange, onAlert, compact = false }) {
  const [gpsState,    setGpsState]    = useState('acquiring');
  const [nearestJob,  setNearestJob]  = useState(null);
  const [distMeters,  setDistMeters]  = useState(null);
  const [accuracy,    setAccuracy]    = useState(null);

  useEffect(() => {
    // Check if user disabled tracking
    const perm = localStorage.getItem('purpulse_perm_location');
    if (perm === 'denied') { setGpsState('denied'); onAlert?.('tracking_disabled'); return; }
    if (perm === 'limited') { setGpsState('limited'); return; }

    if (!navigator.geolocation) { setGpsState('unknown'); return; }

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude, accuracy: acc } = pos.coords;
        setAccuracy(Math.round(acc));

        let closest = null, closestDist = Infinity;
        for (const job of jobs) {
          if (job.site_lat == null || job.site_lon == null) continue;
          const d = haversineDistance(latitude, longitude, job.site_lat, job.site_lon);
          if (d < closestDist) { closestDist = d; closest = job; }
        }

        const isOnSite = closestDist <= GEOFENCE_RADIUS_M;
        const isLowAcc = acc > LOW_ACCURACY_THRESHOLD_M;

        let state;
        if (isLowAcc) {
          state = 'low_accuracy';
          onAlert?.('low_gps_accuracy');
        } else if (isOnSite) {
          state = 'on_site';
        } else {
          state = 'off_site';
          // If we can't find any job site coords at all, signal unverifiable
          if (jobs.length > 0 && jobs.every(j => j.site_lat == null)) {
            onAlert?.('unable_to_verify_arrival');
          }
        }

        setGpsState(state);
        setNearestJob(closest);
        setDistMeters(closestDist === Infinity ? null : Math.round(closestDist));
        onStatusChange?.({ state, job: closest, distMeters: Math.round(closestDist), accuracy: Math.round(acc), lat: latitude, lon: longitude });
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          setGpsState('denied');
          onAlert?.('tracking_disabled');
        } else {
          setGpsState('unknown');
          onAlert?.('unable_to_verify_arrival');
        }
      },
      { enableHighAccuracy: true, maximumAge: 20000, timeout: 12000 }
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, [jobs.length]);

  const cfg  = STATE_CFG[gpsState] || STATE_CFG.unknown;
  const Icon = cfg.Icon;

  if (compact) {
    return (
      <div className={cn('flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-bold', cfg.bg, cfg.cls)}>
        <Icon className={cn('h-3 w-3', cfg.spin && 'animate-spin')} />
        {cfg.label}
      </div>
    );
  }

  return (
    <div className={cn('flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-bold', cfg.bg, cfg.cls)}>
      <Icon className={cn('h-3.5 w-3.5 flex-shrink-0', cfg.spin && 'animate-spin')} />
      <span>{cfg.label}</span>
      {gpsState === 'on_site' && nearestJob && (
        <span className="font-normal opacity-70 truncate max-w-[100px]">{nearestJob.site_name}</span>
      )}
      {gpsState === 'off_site' && distMeters != null && (
        <span className="font-normal opacity-70">
          {distMeters > 1000 ? `${(distMeters/1000).toFixed(1)}km` : `${distMeters}m`} away
        </span>
      )}
      {gpsState === 'low_accuracy' && accuracy != null && (
        <span className="font-normal opacity-70">±{accuracy}m</span>
      )}
    </div>
  );
}