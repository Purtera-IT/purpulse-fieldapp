import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { StatusBadge, PriorityIndicator, SyncBadge } from './StatusBadge';
import { MapPin, Clock, User, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';

export default function JobCard({ job }) {
  return (
    <Link
      to={createPageUrl('JobDetail') + `?id=${job.id}`}
      className="block"
    >
      <div className="bg-white rounded-2xl border border-slate-100 p-4 hover:shadow-md transition-all duration-200 active:scale-[0.98]">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <StatusBadge status={job.status} />
              <SyncBadge status={job.sync_status} />
            </div>
            <h3 className="font-semibold text-slate-900 text-base truncate">{job.title}</h3>
            {job.project_name && (
              <p className="text-xs text-slate-500 mt-0.5">{job.project_name}</p>
            )}
          </div>
          <div className="flex items-center gap-2 ml-3">
            <PriorityIndicator priority={job.priority} />
            <ChevronRight className="h-4 w-4 text-slate-300" />
          </div>
        </div>

        <div className="space-y-1.5">
          {job.site_address && (
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <MapPin className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
              <span className="truncate">{job.site_address}</span>
            </div>
          )}
          {job.scheduled_date && (
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <Clock className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
              <span>
                {format(new Date(job.scheduled_date), 'MMM d, yyyy')}
                {job.scheduled_time && ` at ${job.scheduled_time}`}
              </span>
            </div>
          )}
          {job.contact_name && (
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <User className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
              <span>{job.contact_name}</span>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}