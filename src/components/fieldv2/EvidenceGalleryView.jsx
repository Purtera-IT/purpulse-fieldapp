/**
 * EvidenceGalleryView — Evidence tab (E)
 * Grid of thumbnails with metadata overlay, detail modal, QC actions, labeler.
 */
import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Plus, X, MapPin, Tag, CheckCircle2, XCircle, FileText, Layers } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';
import EvidenceCaptureModal from './EvidenceCaptureModal';
import LabelerModal from './LabelerModal';

const QC_CFG = {
  pass:    { bg: 'bg-emerald-500', label: 'Pass' },
  fail:    { bg: 'bg-red-500',     label: 'Fail' },
  unknown: { bg: 'bg-slate-400',   label: '—'    },
};

function fmtTs(ts) { try { return format(parseISO(ts), 'MMM d HH:mm'); } catch { return ts || '—'; } }

function Thumbnail({ ev, onClick }) {
  const isImg = ev.content_type?.startsWith('image');
  const qc    = QC_CFG[ev.qc_status] || QC_CFG.unknown;
  return (
    <button onClick={() => onClick(ev)}
      className="relative rounded-xl overflow-hidden bg-slate-100 border border-slate-200 hover:border-slate-400 transition-all aspect-square flex items-center justify-center">
      {isImg
        ? <img src={ev.file_url || ev.thumbnail_url} alt="evidence" className="h-full w-full object-cover" />
        : <FileText className="h-8 w-8 text-slate-400" />}
      {/* QC dot */}
      <span className={cn('absolute top-1.5 right-1.5 h-2.5 w-2.5 rounded-full border-2 border-white', qc.bg)} title={qc.label} />
      {/* Step tag */}
      {ev.runbook_step_id && (
        <span className="absolute bottom-1 left-1 bg-black/50 text-white text-[9px] font-bold px-1 rounded">
          {ev.runbook_step_id}
        </span>
      )}
      {ev.geo_lat && <span className="absolute bottom-1 right-1 text-white"><MapPin className="h-2.5 w-2.5 drop-shadow" /></span>}
    </button>
  );
}

function ExifRow({ label, value }) {
  if (!value && value !== 0) return null;
  return (
    <tr className="border-b border-slate-50">
      <td className="py-1.5 pr-3 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">{label}</td>
      <td className="py-1.5 text-xs text-slate-700 font-mono">{String(value)}</td>
    </tr>
  );
}

function DetailModal({ ev, onClose, onLabel, onQC }) {
  const exif = ev.exif_metadata || {};
  const hasGeo = ev.geo_lat != null;
  const isImg = ev.content_type?.startsWith('image');
  const qc = QC_CFG[ev.qc_status] || QC_CFG.unknown;

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center md:justify-center" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-white rounded-t-3xl md:rounded-2xl shadow-2xl max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 pt-5 pb-3 sticky top-0 bg-white border-b border-slate-50 z-10">
          <h2 className="text-sm font-black text-slate-900 truncate flex-1">Evidence Detail</h2>
          <button onClick={onClose} className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0 ml-2">
            <X className="h-4 w-4 text-slate-600" />
          </button>
        </div>

        <div className="px-5 pb-10 space-y-4 mt-3">
          {/* Full-size image */}
          {isImg && (
            <div className="rounded-xl overflow-hidden bg-slate-100 flex items-center justify-center max-h-64">
              <img src={ev.file_url} alt="evidence" className="max-h-64 w-full object-contain" />
            </div>
          )}
          {!isImg && (
            <div className="h-20 bg-slate-50 rounded-xl flex items-center justify-center gap-2 text-slate-500 text-sm font-medium">
              <FileText className="h-6 w-6" /> {ev.content_type}
            </div>
          )}

          {/* QC Status + actions */}
          <div className="flex items-center gap-3">
            <div className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold text-white', qc.bg)}>
              {qc.label === 'Pass' ? <CheckCircle2 className="h-3.5 w-3.5" /> : qc.label === 'Fail' ? <XCircle className="h-3.5 w-3.5" /> : <Layers className="h-3.5 w-3.5" />}
              QC: {qc.label}
            </div>
            <button onClick={() => onQC(ev, 'pass')}
              className="h-8 px-3 rounded-[8px] bg-emerald-50 text-emerald-700 text-xs font-bold hover:bg-emerald-100 flex items-center gap-1">
              <CheckCircle2 className="h-3.5 w-3.5" /> Pass
            </button>
            <button onClick={() => onQC(ev, 'fail')}
              className="h-8 px-3 rounded-[8px] bg-red-50 text-red-700 text-xs font-bold hover:bg-red-100 flex items-center gap-1">
              <XCircle className="h-3.5 w-3.5" /> Fail
            </button>
            <button onClick={() => onLabel(ev)}
              className="h-8 px-3 rounded-[8px] bg-slate-900 text-white text-xs font-bold hover:bg-slate-700 flex items-center gap-1 ml-auto">
              <Tag className="h-3.5 w-3.5" /> Label
            </button>
          </div>

          {/* Metadata */}
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Metadata</p>
            <table className="w-full">
              <tbody>
                <ExifRow label="Type"       value={ev.evidence_type} />
                <ExifRow label="Captured"   value={fmtTs(ev.captured_at)} />
                <ExifRow label="Size"       value={ev.size_bytes ? `${(ev.size_bytes/1024).toFixed(0)} KB` : null} />
                <ExifRow label="MIME"       value={ev.content_type} />
                <ExifRow label="Step"       value={ev.runbook_step_id} />
                <ExifRow label="SHA-256"    value={ev.sha256 ? ev.sha256.slice(0,20) + '…' : null} />
                {hasGeo && <ExifRow label="Latitude"  value={ev.geo_lat?.toFixed(5)} />}
                {hasGeo && <ExifRow label="Longitude" value={ev.geo_lon?.toFixed(5)} />}
                {hasGeo && <ExifRow label="Altitude"  value={ev.geo_altitude_m != null ? `${ev.geo_altitude_m} m` : null} />}
                {hasGeo && <ExifRow label="Accuracy"  value={ev.geo_accuracy_m != null ? `±${ev.geo_accuracy_m} m` : null} />}
                {exif.make  && <ExifRow label="Camera" value={`${exif.make} ${exif.model}`} />}
                {exif.iso   && <ExifRow label="ISO"    value={exif.iso} />}
                {exif.focal_mm && <ExifRow label="Focal"  value={`${exif.focal_mm} mm`} />}
                {exif.exposure_s && <ExifRow label="Exposure" value={`1/${Math.round(1/exif.exposure_s)}s`} />}
                {exif.width_px  && <ExifRow label="Resolution" value={`${exif.width_px}×${exif.height_px}`} />}
              </tbody>
            </table>
          </div>

          {/* Map marker */}
          {hasGeo && (
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Location</p>
              <a href={`https://maps.google.com/?q=${ev.geo_lat},${ev.geo_lon}`} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2 h-9 px-3 rounded-[8px] bg-blue-50 text-blue-700 text-xs font-bold hover:bg-blue-100">
                <MapPin className="h-3.5 w-3.5" />
                {ev.geo_lat?.toFixed(5)}, {ev.geo_lon?.toFixed(5)} — Open in Maps
              </a>
            </div>
          )}

          {ev.notes && (
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Notes</p>
              <p className="text-xs text-slate-600 leading-relaxed">{ev.notes}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function EvidenceGalleryView({ job, evidence, labels, adapters, onRefresh }) {
  const [showCapture,  setShowCapture]  = useState(false);
  const [selectedEv,   setSelectedEv]   = useState(null);
  const [labelerTarget,setLabelerTarget] = useState(null);
  const qc = useQueryClient();

  const qcMutation = useMutation({
    mutationFn: ({ id, verdict }) => base44.entities.Evidence.update(id, { qc_status: verdict }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['fj-evidence', job.id] }); onRefresh?.(); },
  });

  const handleQC = (ev, verdict) => {
    qcMutation.mutate({ id: ev.id, verdict });
    setSelectedEv(null);
  };

  const handleLabel = (ev) => {
    setSelectedEv(null);
    setLabelerTarget(ev);
  };

  const typeGroups = {};
  evidence.forEach(e => {
    const t = e.evidence_type || 'general';
    if (!typeGroups[t]) typeGroups[t] = [];
    typeGroups[t].push(e);
  });

  return (
    <div className="space-y-4">
      {/* Add Evidence */}
      <button onClick={() => setShowCapture(true)}
        className="w-full h-11 rounded-xl border-2 border-dashed border-slate-300 text-slate-500 text-sm font-semibold flex items-center justify-center gap-2 hover:border-slate-500 hover:text-slate-700 transition-colors">
        <Plus className="h-4 w-4" /> Add Evidence
      </button>

      {/* Gallery by type */}
      {Object.entries(typeGroups).map(([type, items]) => (
        <div key={type}>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 capitalize">
            {type.replace(/_/g,' ')} <span className="font-normal text-slate-300">({items.length})</span>
          </p>
          <div className="grid grid-cols-3 gap-2">
            {items.map(ev => (
              <Thumbnail key={ev.id} ev={ev} onClick={setSelectedEv} />
            ))}
          </div>
        </div>
      ))}

      {evidence.length === 0 && (
        <div className="py-16 text-center text-slate-400 text-sm">No evidence yet — tap Add Evidence to start.</div>
      )}

      {/* Modals */}
      {showCapture && (
        <EvidenceCaptureModal
          jobId={job.id}
          adapter={adapters?.upload}
          onClose={() => setShowCapture(false)}
          onSuccess={() => { setShowCapture(false); onRefresh?.(); }}
        />
      )}
      {selectedEv && (
        <DetailModal ev={selectedEv} onClose={() => setSelectedEv(null)} onLabel={handleLabel} onQC={handleQC} />
      )}
      {labelerTarget && (
        <LabelerModal
          evidence={labelerTarget}
          jobId={job.id}
          adapter={adapters?.label}
          onClose={() => setLabelerTarget(null)}
          onSuccess={() => { setLabelerTarget(null); onRefresh?.(); }}
        />
      )}
    </div>
  );
}