/**
 * OfflineEditsIndicator — Shows pending edits queued while offline
 * Displays queue status and allows manual sync attempt
 */

import React, { useEffect, useState } from 'react'
import { AlertCircle, CheckCircle2, Clock, Wifi, WifiOff } from 'lucide-react'
import { jobRepository, type QueuedEdit } from '@/lib/repositories/jobRepository'
import { cn } from '@/lib/utils'

interface Props {
  jobId: string
  isOnline: boolean
}

export default function OfflineEditsIndicator({ jobId, isOnline }: Props) {
  const [pendingEdits, setPendingEdits] = useState<QueuedEdit[]>([])
  const [isSyncing, setIsSyncing] = useState(false)

  // Reload edits when jobId changes or offline status changes
  useEffect(() => {
    const loadEdits = async () => {
      const edits = await jobRepository.getPendingEdits(jobId)
      setPendingEdits(edits)
    }

    loadEdits()
  }, [jobId, isOnline])

  const handleSync = async () => {
    setIsSyncing(true)
    try {
      const result = await jobRepository.drainEditQueue(jobId)
      // Reload edits to show updated status
      const edits = await jobRepository.getPendingEdits(jobId)
      setPendingEdits(edits)
    } finally {
      setIsSyncing(false)
    }
  }

  if (pendingEdits.length === 0) return null

  const pendingCount = pendingEdits.filter(e => e.syncStatus === 'pending').length
  const failedCount = pendingEdits.filter(e => e.syncStatus === 'failed').length
  const syncedCount = pendingEdits.filter(e => e.syncStatus === 'synced').length

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 space-y-2">
      <div className="flex items-center gap-2">
        {isOnline ? (
          <Wifi className="h-4 w-4 text-green-600" />
        ) : (
          <WifiOff className="h-4 w-4 text-amber-600" />
        )}
        <p className="text-sm font-semibold text-amber-900">Offline Edits</p>
      </div>

      <div className="flex items-center gap-4 text-xs">
        <span className="text-amber-700">
          {pendingCount > 0 && <span className="font-bold text-amber-600">{pendingCount} pending</span>}
          {syncedCount > 0 && <span className="text-green-600 ml-2">✓ {syncedCount} synced</span>}
          {failedCount > 0 && <span className="text-red-600 ml-2">✗ {failedCount} failed</span>}
        </span>

        {isOnline && pendingCount > 0 && (
          <button
            onClick={handleSync}
            disabled={isSyncing}
            className={cn(
              'px-2 py-1 rounded text-xs font-bold transition-colors',
              isSyncing ? 'bg-amber-100 text-amber-600 cursor-wait' : 'bg-green-500 text-white hover:bg-green-600'
            )}
          >
            {isSyncing ? 'Syncing...' : 'Sync Now'}
          </button>
        )}
      </div>

      {/* Edit list */}
      {pendingEdits.length > 0 && (
        <div className="space-y-1 border-t border-amber-200 pt-2">
          {pendingEdits.map(edit => (
            <div key={edit.id} className="flex items-center gap-2 text-[11px]">
              {edit.syncStatus === 'pending' && <Clock className="h-3 w-3 text-amber-500" />}
              {edit.syncStatus === 'synced' && <CheckCircle2 className="h-3 w-3 text-green-600" />}
              {edit.syncStatus === 'failed' && <AlertCircle className="h-3 w-3 text-red-600" />}
              <span className={cn('flex-1', edit.syncStatus === 'synced' && 'text-green-600')}>
                {edit.operation.replace(/_/g, ' ')}
              </span>
              {edit.lastError && <span className="text-red-600">{edit.lastError}</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}