/**
 * ActiveJobHero — compact enterprise hero for the active/in-progress job.
 * Rectangular card, radius-md, shadow-sm. Three-column layout:
 *   Left: status + priority badges
 *   Center: title + site
 *   Right: compact timer + Continue CTA + quick-action icon
 */
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ClipboardList, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { STATUS_CFG, PRIORITY_CFG } from './JobRichCard';

function fmtElapsed(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
}

export default function ActiveJobHero({ job }) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const seed = 3600 * 1 + 22 * 60 + 14;
    setElapsed(seed);
    const id = setInterval(() => setElapsed(s => s + 1), 1000);
    return () => clearInterval(id);
  }, [job.id]);

  const statusCfg = STATUS_CFG[job.status]   || STATUS_CFG.in_progress;
  const prioCfg   = PRIORITY_CFG[job.priority] || PRIORITY_CFG.medium;
  const PrioIcon  = prioCfg.Icon;
  const isWorking = job.status === 'in_progress';

  return (
    <div className="rounded-[8px] border border-slate-200 bg-white shadow-[0_2px_6px_rgba(15,23,36,0.06)] p-3 mb-2">
      <div className="flex items-center gap-3">

        {/* ── Left: badges ──────────────────────────────────── */}
        <div className="flex flex-col gap-1 flex-shrink-0 items-start">
          <span className={cn('flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-[4px] whitespace-nowrap', statusCfg.badgeClass)}>
            <span className={cn('h-1.5 w-1.5 rounded-full flex-shrink-0', statusCfg.dotClass, isWorking && 'motion-safe:animate-pulse')} />
            {statusCfg.label}
          </span>
          {PrioIcon && (
            <span className={cn('flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-[4px] whitespace-nowrap', prioCfg.badgeClass)}>
              <PrioIcon className="h-2.5 w-2.5" />
              {prioCfg.label}
            </span>
          )}
        </div>

        {/* ── Center: title + site ──────────────────────────── */}
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Active Job</p>
          <h2 className="text-sm font-black text-slate-900 leading-snug line-clamp-1">{job.title}</h2>
          <p className="text-[11px] text-slate-500 truncate mt-0.5">
            {[job.company_name, job.site_name].filter(Boolean).join(' · ')}
          </p>
          {/* Progress bar */}
          {job.progress != null && (
            <div className="mt-1.5 h-1 bg-slate-100 rounded-full overflow-hidden">
              <div
                className={cn('h-full rounded-full transition-all',
                  job.progress === 100 ? 'bg-emerald-500'
                  : job.progress >= 60  ? 'bg-[#0B66B2]'
                  : job.progress >= 30  ? 'bg-amber-400'
                  : 'bg-red-400'
                )}
                style={{ width: `${job.progress}%` }}
              />
            </div>
          )}
        </div>

        {/* ── Right: timer + CTAs ───────────────────────────── */}
        <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
          {/* Timer */}
          <div className="flex items-center gap-1.5 mb-0.5">
            <span className={cn('h-1.5 w-1.5 rounded-full flex-shrink-0', isWorking ? 'bg-emerald-500 motion-safe:animate-pulse' : 'bg-amber-400')} />
            <span
              className="font-mono font-black tabular-nums text-slate-900 leading-none"
              style={{ fontSize: 'clamp(20px, 5vw, 28px)' }}
            >
              {fmtElapsed(elapsed)}
            </span>
          </div>
          <p className="text-[10px] text-slate-400 font-mono">
            {isWorking ? 'Working' : 'Paused'}
          </p>

          {/* CTA row */}
          <div className="flex items-center gap-1.5 mt-1">
            {/* Quick action: Tasks */}
            <Link
              to={`/JobDetail?id=${job.id}&tab=tasks`}
              className="h-8 w-8 rounded-[6px] bg-slate-100 flex items-center justify-center hover:bg-slate-200 transition-colors flex-shrink-0"
              aria-label="Tasks"
              title="Tasks"
            >
              <ClipboardList className="h-3.5 w-3.5 text-slate-600" />
            </Link>
            {/* Quick action: Details */}
            <Link
              to={`/JobDetail?id=${job.id}`}
              className="h-8 w-8 rounded-[6px] bg-slate-100 flex items-center justify-center hover:bg-slate-200 transition-colors flex-shrink-0"
              aria-label="Details"
              title="Details"
            >
              <Info className="h-3.5 w-3.5 text-slate-600" />
            </Link>
            {/* Continue CTA */}
            <Link
              to={`/JobDetail?id=${job.id}`}
              className="h-8 px-3 rounded-[6px] bg-[#0B2D5C] text-white text-[11px] font-bold flex items-center gap-1 whitespace-nowrap hover:bg-[#0B66B2] transition-colors active:opacity-80"
            >
              Continue
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}