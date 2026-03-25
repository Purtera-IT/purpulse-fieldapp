import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { fieldJobDetailUrl } from '@/utils/fieldRoutes';
import TimeTracker from '../components/field/TimeTracker';
import { StatusBadge } from '../components/field/StatusBadge';
import { Loader2, Briefcase, ArrowRight, MapPin, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';

export default function ActiveJob() {
  const { data: jobs = [], isLoading } = useQuery({
    queryKey: ['jobs'],
    queryFn: () => base44.entities.Job.list('-updated_date', 100),
  });

  const activeJobs = jobs.filter(j => ['checked_in', 'in_progress', 'paused', 'en_route'].includes(j.status));
  const todayJobs = jobs.filter(j => {
    if (!j.scheduled_date) return false;
    const today = format(new Date(), 'yyyy-MM-dd');
    return j.scheduled_date === today && j.status === 'assigned';
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-lg mx-auto px-4 pt-6 pb-24">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight mb-1">Active</h1>
        <p className="text-xs text-slate-400 mb-6">Current and upcoming work</p>

        {activeJobs.length > 0 ? (
          <div className="space-y-4 mb-8">
            {activeJobs.map(job => (
              <div key={job.id} className="bg-white rounded-2xl border border-slate-100 p-4 space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <StatusBadge status={job.status} />
                    <h3 className="font-semibold text-slate-900 mt-2">{job.title}</h3>
                    {job.site_address && (
                      <p className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                        <MapPin className="h-3 w-3" /> {job.site_address}
                      </p>
                    )}
                  </div>
                  <Link to={fieldJobDetailUrl(job.id)}>
                    <Button size="sm" variant="ghost" className="rounded-full">
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                </div>
                <TimeTracker jobId={job.id} compact />
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 mb-8">
            <div className="h-16 w-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
              <Briefcase className="h-8 w-8 text-slate-300" />
            </div>
            <p className="text-slate-500 font-medium">No active jobs</p>
            <p className="text-xs text-slate-400 mt-1">Check in to a job to start working</p>
          </div>
        )}

        {todayJobs.length > 0 && (
          <>
            <h2 className="text-sm font-semibold text-slate-900 mb-3">Today's Assignments</h2>
            <div className="space-y-2">
              {todayJobs.map(job => (
                <Link
                  key={job.id}
                  to={fieldJobDetailUrl(job.id)}
                  className="flex items-center gap-3 bg-white rounded-xl border border-slate-100 p-3"
                >
                  <div className="h-10 w-10 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                    <Clock className="h-5 w-5 text-blue-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">{job.title}</p>
                    <p className="text-xs text-slate-400">
                      {job.scheduled_time || 'No time set'} • {job.site_name || 'No site'}
                    </p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-slate-300" />
                </Link>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}