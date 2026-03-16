import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Camera, AlertTriangle, CheckCircle2, Clock, X, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

const QC_CFG = {
  ok:      { icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-500', label: 'OK' },
  warning: { icon: AlertTriangle, color: 'text-amber-500',  bg: 'bg-amber-500',   label: '!' },
  fail:    { icon: AlertTriangle, color: 'text-red-500',    bg: 'bg-red-500',      label: '✕' },
  pending: { icon: Clock,         color: 'text-slate-400',  bg: 'bg-slate-400',   label: '…' },
};

function Tile({ item, onTap }) {
  const qc = QC_CFG[item.qc_status || 'pending'];
  return (
    <button
      onClick={() => onTap(item)}
      className="relative flex-shrink-0 w-[88px] h-[88px] rounded-2xl overflow-hidden bg-slate-100 active:scale-95 transition-transform"
      aria-label={`${item.evidence_type?.replace(/_/g,' ')} captured at ${item.captured_at ? format(new Date(item.captured_at), 'h:mm a') : 'unknown time'}, QC: ${item.qc_status || 'pending'}`}
    >
      {item.file_url || item.thumbnail_url ? (
        <img src={item.thumbnail_url || item.file_url} alt={item.evidence_type} className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <Camera className="h-7 w-7 text-slate-300" />
        </div>
      )}

      {/* QC dot */}
      <div className={cn('absolute bottom-1.5 left-1.5 h-4 w-4 rounded-full flex items-center justify-center', qc.bg)}>
        <span className="text-white text-[9px] font-black leading-none">{qc.label}</span>
      </div>

      {/* Type chip */}
      <div className="absolute top-1 left-0 right-0 px-1">
        <span className="block text-center text-[9px] font-semibold text-white bg-black/50 rounded px-1 truncate leading-4">
          {item.evidence_type?.replace(/_/g,' ')}
        </span>
      </div>

      {/* Upload pending dot */}
      {item.status === 'pending_upload' && (
        <div className="absolute top-1 right-1 h-3 w-3 rounded-full bg-amber-400 border-2 border-white" />
      )}
    </button>
  );
}

function LightboxModal({ item, onClose }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex flex-col" onClick={onClose}>
      <div className="flex items-center justify-between p-4 flex-shrink-0" onClick={e => e.stopPropagation()}>
        <div>
          <p className="text-white font-semibold capitalize">{item.evidence_type?.replace(/_/g,' ')}</p>
          {item.captured_at && (
            <p className="text-white/50 text-xs mt-0.5">{format(new Date(item.captured_at), 'MMM d, h:mm a')}</p>
          )}
        </div>
        <button onClick={onClose} className="h-10 w-10 rounded-full bg-white/10 flex items-center justify-center">
          <X className="h-5 w-5 text-white" />
        </button>
      </div>

      <div className="flex-1 flex items-center justify-center p-4" onClick={e => e.stopPropagation()}>
        {item.file_url ? (
          <img src={item.file_url} alt={item.evidence_type} className="max-w-full max-h-full rounded-2xl object-contain" />
        ) : (
          <div className="text-white/40 text-sm">No preview available</div>
        )}
      </div>

      {/* Evidence details */}
      <div className="p-4 bg-black/50 flex-shrink-0" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-3">
          {(() => { const qc = QC_CFG[item.qc_status || 'pending']; const Icon = qc.icon;
            return <div className={cn('flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold', qc.bg)}><Icon className="h-3 w-3 text-white"/><span className="text-white">QC {item.qc_status || 'pending'}</span></div>;
          })()}
          {item.qc_message && <p className="text-white/60 text-xs">{item.qc_message}</p>}
        </div>
      </div>
    </div>
  );
}

export default function EvidenceScroller({ job, onAddPhoto }) {
  const [lightbox, setLightbox] = useState(null);

  const { data: evidence = [] } = useQuery({
    queryKey: ['evidence', job?.id],
    queryFn: () => base44.entities.Evidence.filter({ job_id: job?.id }),
    enabled: !!job?.id,
  });

  const visible = evidence.filter(e => e.status !== 'replaced');

  return (
    <>
      <div className="bg-white rounded-2xl border border-slate-100 p-3">
        <div className="flex items-center justify-between mb-2.5 px-0.5">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Evidence</p>
          <span className="text-xs text-slate-400">{visible.length} items</span>
        </div>

        <div className="flex gap-2.5 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
          {/* Add button — always first */}
          <button
            onClick={onAddPhoto}
            className="flex-shrink-0 w-[88px] h-[88px] rounded-2xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center gap-1 active:bg-slate-50 transition-colors"
            aria-label="Add evidence photo"
          >
            <Camera className="h-5 w-5 text-slate-400" />
            <span className="text-[10px] text-slate-400 font-semibold">Add</span>
          </button>

          {visible.map(item => (
            <Tile key={item.id} item={item} onTap={setLightbox} />
          ))}

          {visible.length === 0 && (
            <div className="flex-1 flex items-center py-4 pl-2">
              <p className="text-xs text-slate-400">No evidence yet — tap Add to start</p>
            </div>
          )}
        </div>
      </div>

      {lightbox && <LightboxModal item={lightbox} onClose={() => setLightbox(null)} />}
    </>
  );
}