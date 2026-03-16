/**
 * TimeLog page
 *
 * Layout:
 *   1. Date selector (today ← → prev/next day)
 *   2. Summary chips: Work / Travel / Break totals
 *   3. DailyTimeline — visual segments with drag handles
 *   4. FAB: + Add Manual Entry
 *   5. Admin lock toggle (admin only) — locks all entries for selected day
 *
 * Offline queue flush:
 *   On mount + on window online event, flushes 'purpulse_time_edit_queue'
 *   from localStorage by calling TimeEntry.update() for each queued item.
 */
import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, isToday, differenceInSeconds, addDays, subDays, startOfDay } from 'date-fns';
import { Clock, Plus, ChevronLeft, ChevronRight, Lock, Unlock, Loader2, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import DailyTimeline, { buildSegments } from '../components/field/DailyTimeline';
import TimeSegmentModal from '../components/field/TimeSegmentModal';
import ManualTimeEntryModal from '../components/field/ManualTimeEntryModal';

function calcDurations(entries) {
  const sorted = [...entries].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  let work = 0, travel = 0, breakTime = 0;
  let workStart = null, travelStart = null, breakStart = null;
  for (const e of sorted) {
    const ts = new Date(e.timestamp);
    if (e.entry_type === 'work_start')   workStart   = ts;
    if (e.entry_type === 'work_stop'   && workStart)   { work      += differenceInSeconds(ts, workStart);   workStart   = null; }
    if (e.entry_type === 'travel_start') travelStart = ts;
    if (e.entry_type === 'travel_end'  && travelStart) { travel    += differenceInSeconds(ts, travelStart); travelStart = null; }
    if (e.entry_type === 'break_start')  breakStart  = ts;
    if (e.entry_type === 'break_end'   && breakStart)  { breakTime += differenceInSeconds(ts, breakStart);  breakStart  = null; }
  }
  if (workStart)   work      += differenceInSeconds(new Date(), workStart);
  if (travelStart) travel    += differenceInSeconds(new Date(), travelStart);
  if (breakStart)  breakTime += differenceInSeconds(new Date(), breakStart);
  return { work, travel, break: breakTime };
}

function fmtDuration(s) {
  if (s < 60) return '0m';
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

// Flush offline-queued edits
async function flushOfflineQueue(queryClient) {
  const key = 'purpulse_time_edit_queue';
  const queue = JSON.parse(localStorage.getItem(key) || '[]');
  if (!queue.length) return;
  const remaining = [];
  for (const item of queue) {
    try {
      await base44.entities.TimeEntry.update(item.entryId, item.data);
    } catch {
      remaining.push(item);
    }
  }
  localStorage.setItem(key, JSON.stringify(remaining));
  if (queue.length > remaining.length) {
    queryClient.invalidateQueries({ queryKey: ['all-time-entries'] });
    toast.success(`${queue.length - remaining.length} offline edit(s) synced`);
  }
}

export default function TimeLog() {
  const [date, setDate]               = useState(new Date());
  const [segmentModal, setSegmentModal] = useState(null);
  const [showManual, setShowManual]   = useState(false);
  const queryClient = useQueryClient();

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ['all-time-entries'],
    queryFn: () => base44.entities.TimeEntry.list('-timestamp', 500),
  });

  const { data: jobs = [] } = useQuery({
    queryKey: ['jobs'],
    queryFn: () => base44.entities.Job.list('-updated_date', 100),
  });

  const { data: user } = useQuery({
    queryKey: ['me'],
    queryFn: () => base44.auth.me(),
  });

  const isAdmin = user?.role === 'admin';

  // Flush offline queue on mount and on reconnect
  useEffect(() => {
    if (navigator.onLine) flushOfflineQueue(queryClient);
    const handler = () => flushOfflineQueue(queryClient);
    window.addEventListener('online', handler);
    return () => window.removeEventListener('online', handler);
  }, []);

  const lockEntries = useMutation({
    mutationFn: async (lock) => {
      const dayEntries = entries.filter(e => e.timestamp?.startsWith(format(date, 'yyyy-MM-dd')));
      await Promise.all(dayEntries.map(e =>
        base44.entities.TimeEntry.update(e.id, {
          locked: lock,
          approved_by: lock ? user?.email : null,
          approved_at: lock ? new Date().toISOString() : null,
        })
      ));
    },
    onSuccess: (_, lock) => {
      queryClient.invalidateQueries({ queryKey: ['all-time-entries'] });
      toast.success(lock ? 'All entries locked for this day' : 'Entries unlocked');
    },
  });

  const dateStr = format(date, 'yyyy-MM-dd');
  const dayEntries = entries.filter(e => e.timestamp?.startsWith(dateStr));
  const durations = calcDurations(dayEntries);
  const segments = buildSegments(dayEntries);
  const anyLocked = dayEntries.some(e => e.locked);
  const allLocked = dayEntries.length > 0 && dayEntries.every(e => e.locked);

  const CHIPS = [
    { key: 'work',   label: 'Work',   val: fmtDuration(durations.work),   bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
    { key: 'travel', label: 'Travel', val: fmtDuration(durations.travel), bg: 'bg-blue-50',    text: 'text-blue-700',    border: 'border-blue-200'    },
    { key: 'break',  label: 'Break',  val: fmtDuration(durations.break),  bg: 'bg-amber-50',   text: 'text-amber-700',   border: 'border-amber-200'   },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-lg mx-auto px-4 pt-14 pb-28">

        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Time</h1>
          {allLocked && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200">
              <ShieldCheck className="h-3.5 w-3.5 text-amber-600" />
              <span className="text-xs font-bold text-amber-700">Approved</span>
            </div>
          )}
        </div>

        {/* Date navigator */}
        <div className="flex items-center justify-between bg-white rounded-2xl border border-slate-100 p-1 mb-4">
          <button onClick={() => setDate(d => subDays(d, 1))}
            className="h-10 w-10 rounded-xl flex items-center justify-center active:bg-slate-100">
            <ChevronLeft className="h-4 w-4 text-slate-600" />
          </button>
          <div className="text-center">
            <p className="text-sm font-black text-slate-900">
              {isToday(date) ? 'Today' : format(date, 'EEEE')}
            </p>
            <p className="text-xs text-slate-400">{format(date, 'MMMM d, yyyy')}</p>
          </div>
          <button onClick={() => setDate(d => addDays(d, 1))}
            className="h-10 w-10 rounded-xl flex items-center justify-center active:bg-slate-100"
            disabled={isToday(date)}
          >
            <ChevronRight className={cn('h-4 w-4', isToday(date) ? 'text-slate-200' : 'text-slate-600')} />
          </button>
        </div>

        {/* Summary chips */}
        <div className="flex gap-2 mb-4">
          {CHIPS.map(c => (
            <div key={c.key} className={cn('flex-1 rounded-2xl border px-3 py-3 text-center', c.bg, c.border)}>
              <p className={cn('text-lg font-black tabular-nums', c.text)}>{c.val}</p>
              <p className={cn('text-[10px] font-semibold mt-0.5', c.text)}>{c.label}</p>
            </div>
          ))}
        </div>

        {/* Admin lock/unlock bar */}
        {isAdmin && dayEntries.length > 0 && (
          <div className="flex items-center justify-between bg-white rounded-2xl border border-slate-100 px-4 py-3 mb-4">
            <div className="flex items-center gap-2">
              {allLocked
                ? <ShieldCheck className="h-4 w-4 text-amber-600" />
                : <Lock className="h-4 w-4 text-slate-400" />
              }
              <span className="text-sm font-semibold text-slate-700">
                {allLocked ? 'All entries approved & locked' : anyLocked ? 'Some entries locked' : 'Entries unlocked'}
              </span>
            </div>
            <button
              onClick={() => lockEntries.mutate(!allLocked)}
              disabled={lockEntries.isPending}
              className={cn(
                'flex items-center gap-1.5 h-9 px-4 rounded-xl text-xs font-bold transition-all',
                allLocked ? 'bg-slate-100 text-slate-600' : 'bg-amber-600 text-white'
              )}
            >
              {lockEntries.isPending
                ? <span className="h-3.5 w-3.5 border-2 border-current/30 border-t-current rounded-full animate-spin" />
                : allLocked
                  ? <><Unlock className="h-3.5 w-3.5" /> Unlock</>
                  : <><Lock className="h-3.5 w-3.5" /> Approve & Lock</>
              }
            </button>
          </div>
        )}

        {/* Timeline */}
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
          </div>
        ) : dayEntries.length === 0 ? (
          <div className="text-center py-16">
            <div className="h-16 w-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
              <Clock className="h-8 w-8 text-slate-300" />
            </div>
            <p className="text-slate-500 font-semibold">No time entries</p>
            <p className="text-xs text-slate-400 mt-1">
              {isToday(date) ? 'Start work on a job or add a manual entry' : 'No entries for this day'}
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-100 p-3">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 px-1">
              Timeline · tap segment to edit · drag handles to adjust
            </p>
            <DailyTimeline
              entries={dayEntries}
              date={date}
              onSegmentTap={setSegmentModal}
            />
          </div>
        )}
      </div>

      {/* FAB — Add Manual Entry */}
      {!allLocked && (
        <button
          onClick={() => setShowManual(true)}
          className="fixed bottom-24 right-4 h-14 w-14 rounded-full bg-slate-900 text-white shadow-2xl flex items-center justify-center active:scale-95 transition-transform z-20"
          aria-label="Add manual time entry"
        >
          <Plus className="h-6 w-6" />
        </button>
      )}

      {/* Segment edit modal */}
      {segmentModal && (
        <TimeSegmentModal
          seg={segmentModal}
          allSegments={segments}
          onClose={() => setSegmentModal(null)}
        />
      )}

      {/* Manual entry modal */}
      {showManual && (
        <ManualTimeEntryModal
          jobs={jobs}
          existingEntries={entries}
          onClose={() => setShowManual(false)}
        />
      )}
    </div>
  );
}