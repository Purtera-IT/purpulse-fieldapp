/**
 * MeetingsTab — Meeting attachment (H)
 * Import meeting by ID, upload transcript, link to job.
 */
import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, X, Loader2, Calendar, Users, FileText, ExternalLink, Mic } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';
import { toast } from 'sonner';
import { uuidv4 } from '@/lib/uuid';
import { defaultAdapters } from '@/lib/fieldAdapters';

const MEETING_TYPES = ['kickoff','safety_brief','progress','debrief','incident','client_walkthrough'];

function fmtTs(ts) { try { return format(parseISO(ts), 'MMM d, yyyy HH:mm'); } catch { return ts || '—'; } }

function MeetingCard({ m }) {
  const [open, setOpen] = useState(false);
  const STATUS_CLS = {
    completed:  'bg-emerald-50 text-emerald-700',
    scheduled:  'bg-blue-50 text-blue-700',
    in_progress:'bg-amber-50 text-amber-700',
    cancelled:  'bg-red-50 text-red-700',
  };
  const participants = (() => { try { return JSON.parse(m.attendees_json || '[]'); } catch { return []; } })();

  return (
    <div className="bg-white rounded-xl border border-slate-100">
      <button onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-slate-50 transition-colors rounded-xl">
        <Calendar className="h-4 w-4 text-slate-400 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-slate-900 truncate">{m.title}</p>
          <p className="text-[11px] text-slate-400">{fmtTs(m.scheduled_at)} · {m.meeting_type?.replace(/_/g,' ')}</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full capitalize', STATUS_CLS[m.status] || 'bg-slate-100 text-slate-500')}>
            {m.status}
          </span>
          {m.transcript_url && <Mic className="h-3.5 w-3.5 text-blue-500" title="Has transcript" />}
        </div>
      </button>

      {open && (
        <div className="px-4 pb-4 border-t border-slate-50 space-y-3 pt-3">
          {m.summary && <p className="text-xs text-slate-600 leading-relaxed">{m.summary}</p>}
          {m.external_attendees && (
            <div className="flex items-start gap-2">
              <Users className="h-3.5 w-3.5 text-slate-400 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-slate-600">{m.external_attendees}</p>
            </div>
          )}
          {m.transcript_url && (
            <a href={m.transcript_url} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 h-8 px-3 rounded-[8px] bg-blue-50 text-blue-700 text-xs font-bold hover:bg-blue-100 w-fit">
              <FileText className="h-3.5 w-3.5" /> View Transcript <ExternalLink className="h-3 w-3" />
            </a>
          )}
          {m.recording_url && (
            <a href={m.recording_url} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 h-8 px-3 rounded-[8px] bg-slate-100 text-slate-700 text-xs font-bold hover:bg-slate-200 w-fit">
              <Mic className="h-3.5 w-3.5" /> Recording <ExternalLink className="h-3 w-3" />
            </a>
          )}
          {m.action_items && (() => {
            try {
              const items = JSON.parse(m.action_items);
              if (!items.length) return null;
              return (
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Action Items</p>
                  <div className="space-y-1">
                    {items.map((ai, i) => (
                      <div key={i} className="flex items-start gap-2 text-xs text-slate-600">
                        <span className="text-slate-300 mt-0.5">•</span>
                        <span><strong>{ai.owner?.split('@')[0]}</strong>: {ai.task}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            } catch { return null; }
          })()}
        </div>
      )}
    </div>
  );
}

function ImportMeetingForm({ jobId, adapter, onSuccess, onClose }) {
  const [meetingId,   setMeetingId]   = useState('');
  const [title,       setTitle]       = useState('');
  const [type,        setType]        = useState('progress');
  const [transcript,  setTranscript]  = useState('');
  const [recordingUrl,setRecordingUrl]= useState('');
  const [participants,setParticipants]= useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const qc = useQueryClient();

  const mutation = useMutation({
    mutationFn: () => adapter.createMeeting({
      id:               meetingId || uuidv4(),
      job_id:           jobId,
      title:            title || `Meeting ${new Date().toLocaleDateString()}`,
      meeting_type:     type,
      scheduled_at:     scheduledAt ? new Date(scheduledAt).toISOString() : new Date().toISOString(),
      transcript_url:   transcript
        ? `data:text/plain;base64,${btoa(unescape(encodeURIComponent(transcript)))}`
        : undefined,
      recording_url:    recordingUrl || undefined,
      external_attendees: participants || undefined,
      status:           'completed',
      sync_status:      'synced',
    }, 'admin@purpulse.com'),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['fj-meetings', jobId] });
      toast.success('Meeting imported and linked');
      onSuccess?.();
    },
  });

  return (
    <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-black text-slate-700 uppercase tracking-widest">Import Meeting</p>
        <button onClick={onClose} className="h-6 w-6 rounded-full bg-slate-200 flex items-center justify-center">
          <X className="h-3 w-3 text-slate-600" />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Meeting ID (ext.)</label>
          <input value={meetingId} onChange={e => setMeetingId(e.target.value)}
            placeholder="e.g. teams-abc-123"
            className="w-full h-9 rounded-lg border border-slate-200 bg-white text-xs px-3 focus:outline-none focus:ring-1 focus:ring-slate-400" />
        </div>
        <div>
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Type</label>
          <select value={type} onChange={e => setType(e.target.value)}
            className="w-full h-9 rounded-lg border border-slate-200 bg-white text-xs font-semibold px-3 focus:outline-none focus:ring-1 focus:ring-slate-400 capitalize">
            {MEETING_TYPES.map(t => <option key={t} value={t}>{t.replace(/_/g,' ')}</option>)}
          </select>
        </div>
      </div>

      <div>
        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Title</label>
        <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Meeting title"
          className="w-full h-9 rounded-lg border border-slate-200 bg-white text-xs px-3 focus:outline-none focus:ring-1 focus:ring-slate-400" />
      </div>

      <div>
        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Scheduled At</label>
        <input type="datetime-local" value={scheduledAt} onChange={e => setScheduledAt(e.target.value)}
          className="w-full h-9 rounded-lg border border-slate-200 bg-white text-xs px-3 focus:outline-none focus:ring-1 focus:ring-slate-400" />
      </div>

      <div>
        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Participants (names/emails)</label>
        <input value={participants} onChange={e => setParticipants(e.target.value)}
          placeholder="Name A, Name B, name@example.com…"
          className="w-full h-9 rounded-lg border border-slate-200 bg-white text-xs px-3 focus:outline-none focus:ring-1 focus:ring-slate-400" />
      </div>

      <div>
        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Transcript (paste text)</label>
        <textarea value={transcript} onChange={e => setTranscript(e.target.value)} rows={4}
          placeholder="Paste transcript text or upload a file…"
          className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 resize-none bg-white focus:outline-none focus:ring-1 focus:ring-slate-400" />
      </div>

      <div>
        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Recording URL (mock)</label>
        <input value={recordingUrl} onChange={e => setRecordingUrl(e.target.value)}
          placeholder="https://teams.microsoft.com/recording/…"
          className="w-full h-9 rounded-lg border border-slate-200 bg-white text-xs px-3 focus:outline-none focus:ring-1 focus:ring-slate-400" />
      </div>

      <button onClick={() => mutation.mutate()} disabled={mutation.isPending}
        className="w-full h-10 rounded-lg bg-slate-900 text-white text-xs font-bold flex items-center justify-center gap-2 hover:bg-slate-700 disabled:opacity-50">
        {mutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <><Plus className="h-3.5 w-3.5" /> Link Meeting</>}
      </button>
    </div>
  );
}

export default function MeetingsTab({ job, meetings, adapters, onRefresh }) {
  const [showForm, setShowForm] = useState(false);
  const adapter = adapters?.meeting || defaultAdapters.meeting;

  return (
    <div className="space-y-3">
      {/* Import button */}
      {!showForm && (
        <button onClick={() => setShowForm(true)}
          className="w-full h-11 rounded-xl border-2 border-dashed border-slate-300 text-slate-500 text-sm font-semibold flex items-center justify-center gap-2 hover:border-slate-500 hover:text-slate-700 transition-colors">
          <Plus className="h-4 w-4" /> Import Meeting
        </button>
      )}
      {showForm && (
        <ImportMeetingForm
          jobId={job.id}
          adapter={adapter}
          onSuccess={() => { setShowForm(false); onRefresh?.(); }}
          onClose={() => setShowForm(false)}
        />
      )}

      {/* Meeting cards */}
      {meetings.length === 0 && !showForm && (
        <div className="py-16 text-center text-slate-400 text-sm">No meetings linked — import one above.</div>
      )}
      {meetings.map(m => <MeetingCard key={m.id} m={m} />)}
    </div>
  );
}