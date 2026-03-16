/**
 * DevModelInputs — TechPulse model-input mock viewer
 *
 * Shows how a submitted job + evidence + time entries are packaged
 * into the JSON payload sent to the TechPulse ML pipeline.
 *
 * Two panels:
 *  LEFT  — Live selector: pick a job, select evidence items and time range
 *  RIGHT — Generated JSON payload preview (syntax-highlighted, copy button)
 *
 * No real ML call is made — this is a design/reference mock.
 */
import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { format, differenceInSeconds } from 'date-fns';
import { Copy, Check, Zap, ChevronDown, ChevronUp, BookOpen, Clock, Camera, AlertTriangle, Database } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import AdminShell from '../components/admin/AdminShell';

// ─── helpers ──────────────────────────────────────────────────────────────────
function buildTimeSegments(entries) {
  const sorted = [...entries].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  const segments = [];
  const openMap = {};
  for (const e of sorted) {
    const typeMap = { work_start: 'work', travel_start: 'travel', break_start: 'break' };
    const endMap  = { work_stop: 'work', travel_end: 'travel', break_end: 'break' };
    if (typeMap[e.entry_type]) openMap[typeMap[e.entry_type]] = e.timestamp;
    if (endMap[e.entry_type] && openMap[endMap[e.entry_type]]) {
      const st = endMap[e.entry_type];
      segments.push({
        type: st,
        start: openMap[st],
        end: e.timestamp,
        duration_seconds: differenceInSeconds(new Date(e.timestamp), new Date(openMap[st])),
        source: e.source || 'app',
      });
      delete openMap[st];
    }
  }
  return segments;
}

function sumDurations(segments) {
  const out = { work: 0, travel: 0, break: 0 };
  segments.forEach(s => { if (out[s.type] !== undefined) out[s.type] += s.duration_seconds; });
  return out;
}

// ─── JSON viewer ──────────────────────────────────────────────────────────────
function JsonViewer({ data }) {
  const [copied, setCopied] = useState(false);
  const str = JSON.stringify(data, null, 2);

  const highlighted = str
    .replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+-]?\d+)?)/g, (match) => {
      let cls = 'text-amber-300';
      if (/^"/.test(match)) {
        if (/:$/.test(match)) cls = 'text-blue-300';
        else cls = 'text-emerald-300';
      } else if (/true|false/.test(match)) cls = 'text-purple-300';
      else if (/null/.test(match)) cls = 'text-red-300';
      else cls = 'text-amber-200';
      return `<span class="${cls}">${match}</span>`;
    });

  const handleCopy = async () => {
    await navigator.clipboard.writeText(str);
    setCopied(true);
    toast.success('Payload copied');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative bg-slate-900 rounded-2xl overflow-hidden h-full flex flex-col">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-700">
        <div className="flex items-center gap-2">
          <div className="h-2.5 w-2.5 rounded-full bg-red-500" />
          <div className="h-2.5 w-2.5 rounded-full bg-amber-400" />
          <div className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
          <span className="text-slate-400 text-xs font-mono ml-2">techpulse_model_input.json</span>
        </div>
        <button onClick={handleCopy}
          className={cn('flex items-center gap-1.5 h-7 px-2.5 rounded-lg text-xs font-semibold transition-all',
            copied ? 'bg-emerald-700 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
          )}
        >
          {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <div className="flex-1 overflow-auto p-4">
        <pre className="text-[11px] font-mono leading-relaxed"
          dangerouslySetInnerHTML={{ __html: highlighted }}
        />
      </div>
    </div>
  );
}

// ─── Field row ────────────────────────────────────────────────────────────────
function FieldRow({ icon: Icon, label, value, color = 'text-slate-700', mono = false }) {
  return (
    <div className="flex items-start justify-between gap-3 py-2 border-b border-slate-100 last:border-0">
      <div className="flex items-center gap-2 text-xs text-slate-500 flex-shrink-0">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <span className={cn('text-xs text-right', color, mono && 'font-mono')}>{value}</span>
    </div>
  );
}

// ─── Main ──────────────────────────────────────────────────────────────────────
export default function DevModelInputs() {
  const [selectedJobId, setSelectedJobId] = useState('');
  const [selectedEvIds, setSelectedEvIds] = useState(new Set());
  const [showSchema, setShowSchema] = useState(false);

  const { data: jobs = [] } = useQuery({
    queryKey: ['jobs'],
    queryFn: () => base44.entities.Job.list('-updated_date', 100),
  });

  const selectedJob = jobs.find(j => j.id === selectedJobId);

  const { data: evidence = [] } = useQuery({
    queryKey: ['evidence', selectedJobId],
    queryFn: () => base44.entities.Evidence.filter({ job_id: selectedJobId }),
    enabled: !!selectedJobId,
  });

  const { data: timeEntries = [] } = useQuery({
    queryKey: ['time-entries', selectedJobId],
    queryFn: () => base44.entities.TimeEntry.filter({ job_id: selectedJobId }),
    enabled: !!selectedJobId,
  });

  const { data: blockers = [] } = useQuery({
    queryKey: ['blockers', selectedJobId],
    queryFn: () => base44.entities.Blocker.filter({ job_id: selectedJobId }),
    enabled: !!selectedJobId,
  });

  const visibleEvidence = evidence.filter(e => e.status !== 'replaced');

  const toggleEv = (id) => setSelectedEvIds(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  const selectedEvidence = visibleEvidence.filter(e => selectedEvIds.has(e.id));

  const segments  = useMemo(() => buildTimeSegments(timeEntries), [timeEntries]);
  const durations = useMemo(() => sumDurations(segments), [segments]);

  const payload = useMemo(() => {
    if (!selectedJob) return null;
    return {
      schema_version: '1.0',
      snapshot_id: `snap_mock_${Date.now().toString(36)}`,
      job: {
        id:             selectedJob.id,
        external_id:    selectedJob.external_id || null,
        title:          selectedJob.title,
        status:         selectedJob.status,
        priority:       selectedJob.priority,
        site_name:      selectedJob.site_name || null,
        site_lat:       selectedJob.site_lat  || null,
        site_lon:       selectedJob.site_lon  || null,
        scheduled_date: selectedJob.scheduled_date || null,
        runbook_phases: (selectedJob.runbook_phases || []).map(p => ({
          id: p.id, name: p.name,
          steps: (p.steps || []).map(s => ({
            id: s.id, name: s.name,
            completed: s.completed || false,
            completed_at: s.completed_at || null,
            required_evidence_types: s.required_evidence_types || [],
          })),
        })),
        fields: (selectedJob.fields_schema || []).reduce((acc, f) => {
          acc[f.key] = f.value; return acc;
        }, {}),
      },
      evidence: (selectedEvIds.size > 0 ? selectedEvidence : visibleEvidence).map(ev => ({
        id:             ev.id,
        evidence_type:  ev.evidence_type,
        file_url:       ev.file_url || null,
        quality_score:  ev.quality_score ?? null,
        quality_warning:ev.quality_warning || null,
        geo_lat:        ev.geo_lat ?? null,
        geo_lon:        ev.geo_lon ?? null,
        captured_at:    ev.captured_at || null,
        runbook_step_id:ev.runbook_step_id || null,
        content_type:   ev.content_type || null,
        size_bytes:     ev.size_bytes ?? null,
        notes:          ev.notes || null,
      })),
      time_segments: segments,
      durations_seconds: durations,
      blockers: blockers.map(b => ({
        id:            b.id,
        blocker_type:  b.blocker_type,
        severity:      b.severity,
        note:          b.note,
        status:        b.status,
      })),
      exported_at: new Date().toISOString(),
    };
  }, [selectedJob, selectedEvidence, visibleEvidence, selectedEvIds, segments, durations, blockers]);

  return (
    <AdminShell title="TechPulse Model Inputs" subtitle="Developer mock — job + evidence + time packaged for ML pipeline">
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 h-full">

        {/* ── LEFT: Selector ─────────────────────────────────────── */}
        <div className="space-y-4 overflow-y-auto">

          {/* Job picker */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <div className="flex items-center gap-2 mb-3">
              <BookOpen className="h-4 w-4 text-slate-500" />
              <p className="text-sm font-black text-slate-900">1. Select a Job</p>
            </div>
            <select
              value={selectedJobId}
              onChange={e => { setSelectedJobId(e.target.value); setSelectedEvIds(new Set()); }}
              className="w-full h-11 rounded-xl border border-slate-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400 bg-white"
            >
              <option value="">— pick a job —</option>
              {jobs.map(j => (
                <option key={j.id} value={j.id}>{j.title} [{j.status}]</option>
              ))}
            </select>

            {selectedJob && (
              <div className="mt-3 space-y-0">
                <FieldRow icon={Zap}   label="Status"   value={selectedJob.status?.replace(/_/g, ' ')} color="text-blue-700" />
                <FieldRow icon={AlertTriangle} label="Priority" value={selectedJob.priority} color="text-amber-700" />
                <FieldRow icon={Clock} label="Scheduled" value={selectedJob.scheduled_date || '—'} />
                <FieldRow icon={Database} label="Job ID" value={selectedJob.id.slice(0, 16) + '…'} mono />
              </div>
            )}
          </div>

          {/* Evidence selector */}
          {selectedJobId && visibleEvidence.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Camera className="h-4 w-4 text-slate-500" />
                  <p className="text-sm font-black text-slate-900">2. Evidence ({visibleEvidence.length})</p>
                </div>
                <button
                  onClick={() => setSelectedEvIds(prev => prev.size === visibleEvidence.length ? new Set() : new Set(visibleEvidence.map(e => e.id)))}
                  className="text-xs text-slate-500 font-semibold hover:text-slate-900"
                >
                  {selectedEvIds.size === visibleEvidence.length ? 'Deselect all' : 'Select all'}
                </button>
              </div>
              <div className="space-y-1.5">
                {visibleEvidence.map(ev => (
                  <button key={ev.id} onClick={() => toggleEv(ev.id)}
                    className={cn('w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left text-sm transition-all',
                      selectedEvIds.has(ev.id) || selectedEvIds.size === 0
                        ? 'bg-slate-900 text-white'
                        : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                    )}
                  >
                    {ev.thumbnail_url || ev.file_url ? (
                      <img src={ev.thumbnail_url || ev.file_url} alt="" className="h-9 w-9 rounded-lg object-cover flex-shrink-0" />
                    ) : (
                      <div className="h-9 w-9 rounded-lg bg-slate-200 flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold capitalize text-xs">{ev.evidence_type?.replace(/_/g, ' ')}</p>
                      <p className={cn('text-[10px]', selectedEvIds.has(ev.id) ? 'text-white/60' : 'text-slate-400')}>
                        score: {ev.quality_score ?? '—'} · {ev.captured_at ? format(new Date(ev.captured_at), 'HH:mm') : 'no ts'}
                      </p>
                    </div>
                    {selectedEvIds.size > 0 && (
                      <div className={cn('h-4 w-4 rounded-full border-2 flex-shrink-0',
                        selectedEvIds.has(ev.id) ? 'bg-white border-white' : 'border-slate-400'
                      )} />
                    )}
                  </button>
                ))}
              </div>
              {selectedEvIds.size > 0 && (
                <p className="text-[10px] text-slate-400 mt-2 text-center">{selectedEvIds.size} of {visibleEvidence.length} selected</p>
              )}
            </div>
          )}

          {/* Time summary */}
          {selectedJobId && segments.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 p-5">
              <div className="flex items-center gap-2 mb-3">
                <Clock className="h-4 w-4 text-slate-500" />
                <p className="text-sm font-black text-slate-900">3. Time Segments ({segments.length})</p>
              </div>
              <div className="space-y-1.5">
                {segments.map((s, i) => (
                  <div key={i} className={cn('flex items-center justify-between px-3 py-2 rounded-xl text-xs',
                    s.type === 'work'   ? 'bg-emerald-50 text-emerald-700' :
                    s.type === 'travel' ? 'bg-blue-50 text-blue-700' :
                    'bg-amber-50 text-amber-700'
                  )}>
                    <span className="font-bold capitalize">{s.type}</span>
                    <span className="font-mono">{Math.floor(s.duration_seconds / 60)}m · {s.source}</span>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-3 gap-2 mt-3">
                {Object.entries(durations).map(([k, v]) => (
                  <div key={k} className="text-center bg-slate-50 rounded-xl py-2">
                    <p className="text-xs font-black text-slate-900">{Math.floor(v/60)}m</p>
                    <p className="text-[10px] text-slate-400 capitalize">{k}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Schema reference toggle */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <button onClick={() => setShowSchema(v => !v)}
              className="w-full flex items-center justify-between px-5 py-3.5 text-sm font-black text-slate-900"
            >
              <span>📐 Field → ML-Feature Mapping</span>
              {showSchema ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
            </button>
            {showSchema && (
              <div className="px-5 pb-4 overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-slate-100">
                      <th className="text-left py-1.5 text-slate-400 font-bold pr-4">Field path</th>
                      <th className="text-left py-1.5 text-slate-400 font-bold">ML use</th>
                    </tr>
                  </thead>
                  <tbody className="font-mono">
                    {[
                      ['job.priority',                     'Target label weighting'],
                      ['job.runbook_phases[*].steps[*].completed', 'Completion sequence features'],
                      ['evidence[*].quality_score',        'Image quality signal (0-100)'],
                      ['evidence[*].evidence_type',        'Evidence coverage completeness'],
                      ['evidence[*].geo_lat/lon',          'Spatial proximity to site'],
                      ['time_segments[*].duration_seconds','Time-on-site features'],
                      ['durations_seconds.work',           'Total labour hours'],
                      ['blockers[*].severity',             'Job complexity signal'],
                    ].map(([f, u]) => (
                      <tr key={f} className="border-b border-slate-50">
                        <td className="py-1.5 text-blue-600 pr-4 whitespace-nowrap">{f}</td>
                        <td className="py-1.5 text-slate-600 font-sans">{u}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* ── RIGHT: JSON preview ──────────────────────────────────── */}
        <div className="flex flex-col" style={{ minHeight: 600 }}>
          {payload ? (
            <JsonViewer data={payload} />
          ) : (
            <div className="flex-1 bg-slate-900 rounded-2xl flex flex-col items-center justify-center gap-3 p-8">
              <Zap className="h-12 w-12 text-slate-700" />
              <p className="text-slate-500 font-semibold text-center">Select a job to generate the model input payload</p>
              <p className="text-slate-600 text-xs text-center max-w-xs">
                The right panel shows the exact JSON structure sent to the TechPulse ML pipeline, derived from live job + evidence + time data.
              </p>
            </div>
          )}
        </div>

      </div>
    </AdminShell>
  );
}