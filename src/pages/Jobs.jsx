import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import JobCard from '../components/field/JobCard';
import { Search, Filter, Loader2, Briefcase } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const STATUS_FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'assigned', label: 'Assigned' },
  { value: 'in_progress', label: 'Active' },
  { value: 'pending_closeout', label: 'Closeout' },
  { value: 'submitted', label: 'Submitted' },
];

export default function Jobs() {
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');

  const { data: jobs = [], isLoading } = useQuery({
    queryKey: ['jobs'],
    queryFn: () => base44.entities.Job.list('-scheduled_date', 100),
  });

  const filtered = jobs.filter(job => {
    const matchesSearch = !search || 
      job.title?.toLowerCase().includes(search.toLowerCase()) ||
      job.site_name?.toLowerCase().includes(search.toLowerCase()) ||
      job.project_name?.toLowerCase().includes(search.toLowerCase());
    
    const matchesFilter = activeFilter === 'all' || job.status === activeFilter ||
      (activeFilter === 'in_progress' && ['checked_in', 'in_progress', 'paused', 'en_route'].includes(job.status));
    
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-xl border-b border-slate-100">
        <div className="max-w-lg mx-auto px-4 pt-6 pb-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Jobs</h1>
              <p className="text-xs text-slate-400 mt-0.5">{filtered.length} work orders</p>
            </div>
            <div className="h-10 w-10 rounded-full bg-slate-900 flex items-center justify-center">
              <Briefcase className="h-5 w-5 text-white" />
            </div>
          </div>

          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search jobs, sites, projects..."
              className="pl-9 rounded-xl bg-slate-50 border-0 focus-visible:ring-1 h-10"
            />
          </div>

          <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
            {STATUS_FILTERS.map(f => (
              <button
                key={f.value}
                onClick={() => setActiveFilter(f.value)}
                className={cn(
                  'px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all',
                  activeFilter === f.value
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-4">
        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <div className="h-16 w-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
              <Briefcase className="h-8 w-8 text-slate-300" />
            </div>
            <p className="text-slate-500 font-medium">No jobs found</p>
            <p className="text-slate-400 text-sm mt-1">Assigned jobs will appear here</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(job => (
              <JobCard key={job.id} job={job} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}