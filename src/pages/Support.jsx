/**
 * Support page
 *
 * Sections:
 *   1. Sync status banner (online/offline, pending/failed counts, Retry All CTA)
 *   2. Queued items viewer (collapsible, shows all SyncQueue items)
 *   3. Device info (device_id, version) + Diagnostics modal launcher
 *   4. User profile + Logout
 *
 * Retry All microflow:
 *   1. Collect all SyncQueue items with status='failed'
 *   2. Batch update: status='pending', retry_count += 1, last_error=null
 *   3. Show toast: "N items queued for retry"
 *   4. Items appear as 'Pending' in the viewer while they process
 *   5. On next sync cycle (SyncIndicator polling) they move to completed/failed
 */
import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle, LogOut, Wifi, WifiOff, RefreshCw,
  User, ChevronDown, ChevronUp, Activity, Smartphone, CheckCircle2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import QueuedItemsViewer from '../components/field/QueuedItemsViewer';
import DiagnosticsModal from '../components/field/DiagnosticsModal';

const DEVICE_ID_KEY = 'purpulse_device_id';
function getOrCreateDeviceId() {
  let id = localStorage.getItem(DEVICE_ID_KEY);
  if (!id) {
    id = 'dev-' + Date.now().toString(36) + '-' + Math.random().toString(36).substr(2, 6);
    localStorage.setItem(DEVICE_ID_KEY, id);
  }
  return id;
}

export default function Support() {
  const [isOnline, setIsOnline]           = useState(navigator.onLine);
  const [showQueue, setShowQueue]         = useState(true);
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const deviceId = getOrCreateDeviceId();
  const queryClient = useQueryClient();

  useEffect(() => {
    const on  = () => setIsOnline(true);
    const off = () => setIsOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);

  const { data: user } = useQuery({
    queryKey: ['me'],
    queryFn: () => base44.auth.me(),
  });

  const { data: syncItems = [], isLoading: syncLoading } = useQuery({
    queryKey: ['sync-queue-all'],
    queryFn: () => base44.entities.SyncQueue.list('-created_date', 100),
    refetchInterval: 5000,
  });

  const { data: jobs = [] } = useQuery({
    queryKey: ['jobs'],
    queryFn: () => base44.entities.Job.list('-updated_date', 100),
  });

  const pendingItems = syncItems.filter(s => s.status === 'pending' || s.status === 'in_progress');
  const failedItems  = syncItems.filter(s => s.status === 'failed');
  const activeItems  = syncItems.filter(s => s.status !== 'completed');

  // Last error for banner
  const lastError = [...failedItems].sort((a, b) =>
    new Date(b.created_date || 0) - new Date(a.created_date || 0)
  )[0];

  const retryAll = useMutation({
    mutationFn: async () => {
      await Promise.all(failedItems.map(item =>
        base44.entities.SyncQueue.update(item.id, {
          status: 'pending',
          retry_count: (item.retry_count || 0) + 1,
          last_error: null,
        })
      ));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sync-queue-all'] });
      toast.success(`${failedItems.length} item${failedItems.length !== 1 ? 's' : ''} queued for retry`, {
        description: 'They will sync in the background',
      });
    },
  });

  const hasPending = pendingItems.length > 0;
  const hasFailed  = failedItems.length > 0;

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-lg mx-auto px-4 pt-14 pb-28 space-y-4">

        {/* Header */}
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Support</h1>
          <p className="text-xs text-slate-400 mt-0.5">Sync status, diagnostics & account</p>
        </div>

        {/* ── Sync status banner ─────────────────────────── */}
        <div className={cn(
          'rounded-2xl border p-4 space-y-3',
          hasFailed  ? 'bg-red-50 border-red-200'
          : hasPending ? 'bg-blue-50 border-blue-200'
          : 'bg-emerald-50 border-emerald-200'
        )}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              {!isOnline && <WifiOff className="h-5 w-5 text-red-600" />}
              {isOnline && hasFailed  && <AlertTriangle className="h-5 w-5 text-red-600" />}
              {isOnline && !hasFailed && hasPending && <RefreshCw className="h-5 w-5 text-blue-500 animate-spin" />}
              {isOnline && !hasFailed && !hasPending && <CheckCircle2 className="h-5 w-5 text-emerald-600" />}
              <div>
                <p className={cn('text-sm font-black',
                  hasFailed ? 'text-red-800' : hasPending ? 'text-blue-800' : 'text-emerald-800'
                )}>
                  {!isOnline ? 'Offline'
                    : hasFailed  ? `${failedItems.length} sync failed`
                    : hasPending ? `${pendingItems.length} syncing…`
                    : 'All synced'}
                </p>
                <p className={cn('text-xs',
                  hasFailed ? 'text-red-600' : hasPending ? 'text-blue-600' : 'text-emerald-600'
                )}>
                  {!isOnline ? 'Edits saved locally — will sync on reconnect'
                    : hasFailed ? 'Tap Retry All to reprocess failed events'
                    : hasPending ? 'Background sync in progress'
                    : 'Queue empty'}
                </p>
              </div>
            </div>
            {/* Retry All in banner */}
            {hasFailed && isOnline && (
              <button
                onClick={() => retryAll.mutate()}
                disabled={retryAll.isPending}
                className="flex items-center gap-1.5 h-9 px-4 rounded-xl bg-red-600 text-white text-xs font-bold active:opacity-80 flex-shrink-0"
              >
                {retryAll.isPending
                  ? <span className="h-3.5 w-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  : <RefreshCw className="h-3.5 w-3.5" />
                }
                Retry All
              </button>
            )}
          </div>

          {/* Last error snippet */}
          {lastError?.last_error && (
            <div className="bg-red-100/60 rounded-xl px-3 py-2">
              <p className="text-[10px] font-bold text-red-600 mb-0.5">Last error</p>
              <p className="text-[10px] font-mono text-red-700 break-all leading-snug">{lastError.last_error}</p>
            </div>
          )}
        </div>

        {/* ── Queued items section ───────────────────────── */}
        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
          <button
            onClick={() => setShowQueue(v => !v)}
            className="w-full flex items-center justify-between px-4 py-3.5 active:bg-slate-50"
          >
            <div className="flex items-center gap-2">
              <p className="text-sm font-black text-slate-900">Queued Items</p>
              {activeItems.length > 0 && (
                <span className={cn(
                  'px-2 py-0.5 rounded-full text-[10px] font-bold',
                  hasFailed ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
                )}>
                  {activeItems.length}
                </span>
              )}
            </div>
            {showQueue ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
          </button>

          {showQueue && (
            <div className="px-4 pb-4">
              <QueuedItemsViewer
                items={activeItems}
                jobs={jobs}
                onRetryAll={() => retryAll.mutate()}
              />
            </div>
          )}
        </div>

        {/* ── Device info + Diagnostics ──────────────────── */}
        <div className="bg-white rounded-2xl border border-slate-100 p-4 space-y-3">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Device</p>

          <div className="bg-slate-50 rounded-xl px-3 py-2.5 font-mono space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-slate-400">device_id</span>
              <span className="text-[10px] text-slate-700">{deviceId}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-slate-400">network</span>
              <span className={cn('text-[10px] font-semibold', isOnline ? 'text-emerald-600' : 'text-red-600')}>
                {isOnline ? '● online' : '● offline'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-slate-400">offline_queue</span>
              <span className="text-[10px] text-slate-700">
                {JSON.parse(localStorage.getItem('purpulse_time_edit_queue') || '[]').length} item(s)
              </span>
            </div>
          </div>

          <button
            onClick={() => setShowDiagnostics(true)}
            className="w-full h-11 rounded-xl border-2 border-slate-200 text-slate-700 text-sm font-semibold flex items-center justify-center gap-2 active:bg-slate-50"
          >
            <Activity className="h-4 w-4 text-slate-500" />
            Open Diagnostics &amp; Logs
          </button>
        </div>

        {/* ── User / Logout ─────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-slate-100 p-4 space-y-4">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Account</p>
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0">
              <User className="h-6 w-6 text-slate-400" />
            </div>
            <div className="min-w-0">
              <p className="font-bold text-slate-900 truncate">{user?.full_name || 'Technician'}</p>
              <p className="text-xs text-slate-400 truncate">{user?.email}</p>
              {user?.role && (
                <span className="text-[10px] font-bold text-slate-500 capitalize bg-slate-100 px-2 py-0.5 rounded-full">
                  {user.role}
                </span>
              )}
            </div>
          </div>

          <button
            onClick={() => base44.auth.logout()}
            className="w-full h-12 rounded-xl border-2 border-red-200 text-red-600 font-bold text-sm flex items-center justify-center gap-2 active:bg-red-50"
          >
            <LogOut className="h-4 w-4" />
            Log Out
          </button>
        </div>

      </div>

      {/* Diagnostics modal */}
      {showDiagnostics && (
        <DiagnosticsModal onClose={() => setShowDiagnostics(false)} />
      )}
    </div>
  );
}