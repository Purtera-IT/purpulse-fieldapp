import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { format, isToday, startOfDay, differenceInSeconds } from 'date-fns';
import { Clock, Play, Square, Coffee, Car, Loader2, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

const TYPE_CONFIG = {
  work_start: { icon: Play, label: 'Work Start', color: 'text-emerald-600', bg: 'bg-emerald-50' },
  work_stop: { icon: Square, label: 'Work Stop', color: 'text-red-600', bg: 'bg-red-50' },
  break_start: { icon: Coffee, label: 'Break Start', color: 'text-amber-600', bg: 'bg-amber-50' },
  break_end: { icon: Coffee, label: 'Break End', color: 'text-amber-600', bg: 'bg-amber-50' },
  travel_start: { icon: Car, label: 'Travel Start', color: 'text-blue-600', bg: 'bg-blue-50' },
  travel_end: { icon: Car, label: 'Travel End', color: 'text-blue-600', bg: 'bg-blue-50' },
};

function calcDurations(entries) {
  const sorted = [...entries].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  let work = 0, travel = 0, breakTime = 0;
  let workStart = null, travelStart = null, breakStart = null;

  for (const e of sorted) {
    const ts = new Date(e.timestamp);
    if (e.entry_type === 'work_start') workStart = ts;
    if (e.entry_type === 'work_stop' && workStart) { work += differenceInSeconds(ts, workStart); workStart = null; }
    if (e.entry_type === 'travel_start') travelStart = ts;
    if (e.entry_type === 'travel_end' && travelStart) { travel += differenceInSeconds(ts, travelStart); travelStart = null; }
    if (e.entry_type === 'break_start') breakStart = ts;
    if (e.entry_type === 'break_end' && breakStart) { breakTime += differenceInSeconds(ts, breakStart); breakStart = null; }
  }

  if (workStart) work += differenceInSeconds(new Date(), workStart);
  if (travelStart) travel += differenceInSeconds(new Date(), travelStart);
  if (breakStart) breakTime += differenceInSeconds(new Date(), breakStart);

  return { work, travel, break: breakTime };
}

function formatSecs(s) {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return `${h}h ${m}m`;
}

export default function TimeLog() {
  const { data: entries = [], isLoading } = useQuery({
    queryKey: ['all-time-entries'],
    queryFn: () => base44.entities.TimeEntry.list('-timestamp', 200),
  });

  const { data: jobs = [] } = useQuery({
    queryKey: ['jobs'],
    queryFn: () => base44.entities.Job.list('-updated_date', 100),
  });

  const todayEntries = entries.filter(e => e.timestamp && isToday(new Date(e.timestamp)));
  const durations = calcDurations(todayEntries);

  const jobMap = Object.fromEntries(jobs.map(j => [j.id, j]));

  const groupedByJob = {};
  todayEntries.forEach(e => {
    if (!groupedByJob[e.job_id]) groupedByJob[e.job_id] = [];
    groupedByJob[e.job_id].push(e);
  });

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-lg mx-auto px-4 pt-6 pb-24">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight mb-1">Time</h1>
        <p className="text-xs text-slate-400 mb-6">{format(new Date(), 'EEEE, MMMM d')}</p>

        <div className="grid grid-cols-3 gap-2 mb-6">
          <div className="bg-emerald-50 rounded-2xl p-4 text-center">
            <p className="text-2xl font-bold text-emerald-700 tabular-nums">{formatSecs(durations.work)}</p>
            <p className="text-xs text-emerald-600 mt-1">Work</p>
          </div>
          <div className="bg-blue-50 rounded-2xl p-4 text-center">
            <p className="text-2xl font-bold text-blue-700 tabular-nums">{formatSecs(durations.travel)}</p>
            <p className="text-xs text-blue-600 mt-1">Travel</p>
          </div>
          <div className="bg-amber-50 rounded-2xl p-4 text-center">
            <p className="text-2xl font-bold text-amber-700 tabular-nums">{formatSecs(durations.break)}</p>
            <p className="text-xs text-amber-600 mt-1">Break</p>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
          </div>
        ) : todayEntries.length === 0 ? (
          <div className="text-center py-12">
            <div className="h-16 w-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
              <Clock className="h-8 w-8 text-slate-300" />
            </div>
            <p className="text-slate-500 font-medium">No time entries today</p>
            <p className="text-xs text-slate-400 mt-1">Start work on a job to track time</p>
          </div>
        ) : (
          <div className="space-y-4">
            {Object.entries(groupedByJob).map(([jobId, jobEntries]) => {
              const job = jobMap[jobId];
              const sorted = [...jobEntries].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
              return (
                <div key={jobId} className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
                  <Link
                    to={createPageUrl('JobDetail') + `?id=${jobId}`}
                    className="flex items-center justify-between p-3 bg-slate-50 border-b border-slate-100"
                  >
                    <p className="text-sm font-medium text-slate-900 truncate">{job?.title || 'Unknown Job'}</p>
                    <ChevronRight className="h-4 w-4 text-slate-400" />
                  </Link>
                  <div className="divide-y divide-slate-50">
                    {sorted.map(entry => {
                      const config = TYPE_CONFIG[entry.entry_type] || TYPE_CONFIG.work_start;
                      const Icon = config.icon;
                      return (
                        <div key={entry.id} className="flex items-center gap-3 px-3 py-2.5">
                          <div className={cn('h-8 w-8 rounded-lg flex items-center justify-center', config.bg)}>
                            <Icon className={cn('h-4 w-4', config.color)} />
                          </div>
                          <div className="flex-1">
                            <p className="text-sm text-slate-900">{config.label}</p>
                          </div>
                          <p className="text-xs text-slate-500 font-mono tabular-nums">
                            {format(new Date(entry.timestamp), 'h:mm a')}
                          </p>
                          {entry.sync_status === 'pending' && (
                            <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}