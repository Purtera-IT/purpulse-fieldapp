/**
 * JobsHeader — Compact enterprise-style header for Jobs page
 * Provides: branding, search, filter chips, view toggles, sync status
 */
import React from 'react';
import { Search, Grid, List, Calendar, RefreshCw, Table2, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function JobsHeader({
  jobCount = 0,
  activeFilter = 'all',
  onFilterChange = () => {},
  view = 'list',
  onViewChange = () => {},
  query = '',
  onSearch = () => {},
  syncStatus = { state: 'synced', lastUpdated: null },
  onAdvancedFilters = () => {},
  activeFilterCount = 0,
}) {
  const filters = [
    { id: 'all', label: 'All', count: jobCount },
    { id: 'active', label: 'Active' },
    { id: 'assigned', label: 'Assigned' },
    { id: 'pending_closeout', label: 'Closeout' },
    { id: 'completed', label: 'Done' },
  ];

  const syncDotColor =
    syncStatus.state === 'synced' ? 'bg-emerald-500' :
    syncStatus.state === 'syncing' ? 'bg-amber-400' :
    'bg-slate-300';

  const syncLabel =
    syncStatus.state === 'synced' ? 'Synced' :
    syncStatus.state === 'syncing' ? 'Syncing…' :
    'Offline';

  return (
    <header className="sticky top-14 z-10 bg-white border-b border-slate-100 shadow-sm">
      <div className="max-w-2xl mx-auto px-3 py-2.5 space-y-2.5">

        {/* ── Top row: branding + view toggle + sync ── */}
        <div className="flex items-center justify-between gap-3">
          {/* Branding */}
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex items-center justify-center h-8 w-8 rounded-[6px] bg-[#0B2D5C] text-white font-bold text-sm flex-shrink-0">
              P
            </div>
            <div className="min-w-0">
              <div className="text-sm font-bold text-slate-900 leading-tight">Purpulse</div>
              <div className="text-[10px] text-slate-500 leading-tight">Field Operations</div>
            </div>
          </div>

          {/* Right actions: view toggle + sync status */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Sync status */}
            <div
              className="flex items-center gap-1.5 text-[11px] text-slate-600 font-semibold px-2.5 py-1 rounded-[6px] bg-slate-50"
              aria-live="polite"
              aria-label={`Sync status: ${syncLabel}`}
            >
              <span
                className={cn('h-1.5 w-1.5 rounded-full flex-shrink-0', syncDotColor)}
                aria-hidden="true"
              />
              <span className="hidden sm:inline">{syncLabel}</span>
            </div>

            {/* View toggle */}
            <div
              className="inline-flex items-center gap-0.5 bg-slate-100 rounded-[6px] p-0.5"
              role="tablist"
              aria-label="View options"
            >
              {[
                { id: 'list', Icon: List, label: 'List' },
                { id: 'cards', Icon: Grid, label: 'Cards' },
                { id: 'table', Icon: Table2, label: 'Table' },
                { id: 'calendar', Icon: Calendar, label: 'Calendar' },
              ].map(({ id, Icon, label }) => (
                <button
                  key={id}
                  role="tab"
                  aria-selected={view === id}
                  onClick={() => onViewChange(id)}
                  className={cn(
                    'h-8 w-8 rounded-[4px] flex items-center justify-center transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#0B2D5C]',
                    view === id ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'
                  )}
                  aria-label={label}
                  title={label}
                >
                  <Icon className="h-3.5 w-3.5" />
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── Search input ── */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
          <input
            type="search"
            role="searchbox"
            aria-label="Search jobs, sites, projects"
            placeholder="Search jobs, sites, projects…"
            value={query}
            onChange={(e) => onSearch(e.target.value)}
            className="w-full pl-10 pr-9 py-2 rounded-[6px] bg-slate-50 border border-slate-200 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0B2D5C] focus:ring-offset-0 focus:border-transparent"
          />
          {query && (
            <button
              onClick={() => onSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-slate-200 transition-colors focus:outline-none focus:ring-2 focus:ring-[#0B2D5C]"
              aria-label="Clear search"
            >
              <X className="h-3 w-3 text-slate-400" />
            </button>
          )}
        </div>

        {/* ── Filter chips + advanced button ── */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
          {filters.map((f) => (
            <button
              key={f.id}
              onClick={() => onFilterChange(f.id)}
              aria-pressed={activeFilter === f.id}
              className={cn(
                'flex items-center gap-1.5 px-2.5 py-1 rounded-[6px] text-[11px] font-semibold whitespace-nowrap flex-shrink-0 transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#0B2D5C]',
                activeFilter === f.id
                  ? 'bg-[#0B2D5C] text-white'
                  : 'bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-50'
              )}
            >
              {f.label}
              {f.count != null && f.id === 'all' && (
                <span className="text-[10px] bg-slate-200 px-1.5 py-0 rounded-[3px] font-bold">
                  {f.count}
                </span>
              )}
            </button>
          ))}

          {/* Advanced filters button */}
          <button
            onClick={onAdvancedFilters}
            className={cn(
              'flex items-center gap-1 h-7 px-2 rounded-[6px] border text-[10px] font-semibold flex-shrink-0 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#0B2D5C]',
              activeFilterCount > 0
                ? 'bg-[#0B2D5C] text-white border-[#0B2D5C]'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            )}
            aria-label={`Advanced filters${activeFilterCount > 0 ? ` (${activeFilterCount} active)` : ''}`}
          >
            <RefreshCw className="h-3 w-3" />
            {activeFilterCount > 0 && <span className="font-black">{activeFilterCount}</span>}
          </button>
        </div>

      </div>
    </header>
  );
}