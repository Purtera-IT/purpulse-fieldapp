import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, MessageSquare, HelpCircle, Phone, LogOut, ChevronRight, User, Wifi, WifiOff, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

const SEVERITY_COLORS = {
  low: 'bg-blue-50 text-blue-700 border-blue-200',
  medium: 'bg-amber-50 text-amber-700 border-amber-200',
  high: 'bg-orange-50 text-orange-700 border-orange-200',
  critical: 'bg-red-50 text-red-700 border-red-200',
};

export default function Support() {
  const [user, setUser] = useState(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const { data: blockers = [] } = useQuery({
    queryKey: ['all-blockers'],
    queryFn: () => base44.entities.Blocker.list('-created_date', 50),
  });

  const { data: syncItems = [] } = useQuery({
    queryKey: ['sync-queue-all'],
    queryFn: () => base44.entities.SyncQueue.list('-created_date', 50),
  });

  const pendingSync = syncItems.filter(s => s.status === 'pending' || s.status === 'in_progress');
  const failedSync = syncItems.filter(s => s.status === 'failed');

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-lg mx-auto px-4 pt-6 pb-24">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight mb-1">Support</h1>
        <p className="text-xs text-slate-400 mb-6">Help, status & account</p>

        {/* Network Status */}
        <div className={cn(
          'rounded-2xl border p-4 mb-4 flex items-center gap-3',
          isOnline ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'
        )}>
          {isOnline ? <Wifi className="h-5 w-5 text-emerald-600" /> : <WifiOff className="h-5 w-5 text-red-600" />}
          <div>
            <p className={cn('text-sm font-medium', isOnline ? 'text-emerald-700' : 'text-red-700')}>
              {isOnline ? 'Online' : 'Offline'}
            </p>
            <p className={cn('text-xs', isOnline ? 'text-emerald-600' : 'text-red-600')}>
              {isOnline ? 'Data is syncing normally' : 'Changes will sync when connection returns'}
            </p>
          </div>
        </div>

        {/* Sync Status */}
        {(pendingSync.length > 0 || failedSync.length > 0) && (
          <div className="bg-white rounded-2xl border border-slate-100 p-4 mb-4">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-3">Sync Queue</p>
            {pendingSync.length > 0 && (
              <div className="flex items-center gap-2 mb-2">
                <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />
                <span className="text-sm text-slate-600">{pendingSync.length} items pending</span>
              </div>
            )}
            {failedSync.length > 0 && (
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-red-500" />
                <span className="text-sm text-red-600">{failedSync.length} items failed</span>
              </div>
            )}
          </div>
        )}

        {/* Blockers */}
        <div className="bg-white rounded-2xl border border-slate-100 p-4 mb-4">
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-3">
            Recent Blockers ({blockers.length})
          </p>
          {blockers.length === 0 ? (
            <p className="text-sm text-slate-400 py-2">No blockers reported</p>
          ) : (
            <div className="space-y-2">
              {blockers.slice(0, 5).map(b => (
                <div key={b.id} className={cn(
                  'rounded-xl border p-3',
                  SEVERITY_COLORS[b.severity] || SEVERITY_COLORS.medium
                )}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold capitalize">{b.blocker_type?.replace(/_/g, ' ')}</span>
                    <span className="text-xs capitalize">{b.status}</span>
                  </div>
                  <p className="text-xs">{b.note}</p>
                  {b.created_date && (
                    <p className="text-xs opacity-60 mt-1">{format(new Date(b.created_date), 'MMM d, h:mm a')}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* User Info */}
        <div className="bg-white rounded-2xl border border-slate-100 p-4 mb-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center">
              <User className="h-6 w-6 text-slate-400" />
            </div>
            <div>
              <p className="font-medium text-slate-900">{user?.full_name || 'Technician'}</p>
              <p className="text-xs text-slate-500">{user?.email}</p>
            </div>
          </div>
          <Button
            variant="outline"
            className="w-full rounded-xl text-red-600 border-red-200 hover:bg-red-50"
            onClick={() => base44.auth.logout()}
          >
            <LogOut className="h-4 w-4 mr-2" />
            Log Out
          </Button>
        </div>
      </div>
    </div>
  );
}