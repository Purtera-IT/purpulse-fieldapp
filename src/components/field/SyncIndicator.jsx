import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { RefreshCw, Wifi, WifiOff, Check, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function SyncIndicator() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const { data: pendingItems = [] } = useQuery({
    queryKey: ['sync-queue-pending'],
    queryFn: () => base44.entities.SyncQueue.filter({ status: 'pending' }),
    refetchInterval: 5000,
  });

  const { data: failedItems = [] } = useQuery({
    queryKey: ['sync-queue-failed'],
    queryFn: () => base44.entities.SyncQueue.filter({ status: 'failed' }),
    refetchInterval: 10000,
  });

  const pendingCount = pendingItems.length;
  const failedCount = failedItems.length;

  if (!isOnline) {
    return (
      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-50 text-red-600 text-xs font-medium">
        <WifiOff className="h-3 w-3" />
        Offline
      </div>
    );
  }

  if (failedCount > 0) {
    return (
      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 text-amber-600 text-xs font-medium">
        <AlertTriangle className="h-3 w-3" />
        {failedCount} failed
      </div>
    );
  }

  if (pendingCount > 0) {
    return (
      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 text-blue-600 text-xs font-medium">
        <RefreshCw className="h-3 w-3 animate-spin" />
        Syncing {pendingCount}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-600 text-xs font-medium">
      <Check className="h-3 w-3" />
      Synced
    </div>
  );
}