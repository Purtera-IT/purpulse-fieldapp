import React from 'react';
import { cn } from '@/lib/utils';

const STATUS_CONFIG = {
  assigned: { label: 'Assigned', bg: 'bg-slate-100', text: 'text-slate-700', dot: 'bg-slate-400' },
  en_route: { label: 'En Route', bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-400' },
  checked_in: { label: 'Checked In', bg: 'bg-cyan-50', text: 'text-cyan-700', dot: 'bg-cyan-400' },
  in_progress: { label: 'In Progress', bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-400' },
  paused: { label: 'Paused', bg: 'bg-orange-50', text: 'text-orange-700', dot: 'bg-orange-400' },
  pending_closeout: { label: 'Pending Closeout', bg: 'bg-purple-50', text: 'text-purple-700', dot: 'bg-purple-400' },
  submitted: { label: 'Submitted', bg: 'bg-indigo-50', text: 'text-indigo-700', dot: 'bg-indigo-400' },
  approved: { label: 'Approved', bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-400' },
  rejected: { label: 'Rejected', bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-400' },
};

const PRIORITY_CONFIG = {
  low: { label: 'Low', color: 'text-slate-500' },
  medium: { label: 'Medium', color: 'text-amber-600' },
  high: { label: 'High', color: 'text-orange-600' },
  urgent: { label: 'Urgent', color: 'text-red-600' },
};

export function StatusBadge({ status, size = 'sm' }) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.assigned;
  return (
    <span className={cn(
      'inline-flex items-center gap-1.5 rounded-full font-medium',
      config.bg, config.text,
      size === 'sm' ? 'px-2.5 py-0.5 text-xs' : 'px-3 py-1 text-sm'
    )}>
      <span className={cn('h-1.5 w-1.5 rounded-full', config.dot)} />
      {config.label}
    </span>
  );
}

export function PriorityIndicator({ priority }) {
  const config = PRIORITY_CONFIG[priority] || PRIORITY_CONFIG.medium;
  return (
    <span className={cn('text-xs font-semibold uppercase tracking-wide', config.color)}>
      {config.label}
    </span>
  );
}

export function SyncBadge({ status }) {
  if (status === 'synced') return null;
  return (
    <span className={cn(
      'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium',
      status === 'pending' ? 'bg-yellow-50 text-yellow-700' : 'bg-red-50 text-red-700'
    )}>
      <span className={cn(
        'h-1.5 w-1.5 rounded-full',
        status === 'pending' ? 'bg-yellow-400 animate-pulse' : 'bg-red-400'
      )} />
      {status === 'pending' ? 'Pending sync' : 'Sync error'}
    </span>
  );
}

export default StatusBadge;