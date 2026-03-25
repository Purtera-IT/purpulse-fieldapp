/**
 * EvidenceGalleryView — Evidence tab (E)
 * Completeness-first: requirements vs uploaded, honest per-item status, capture with mapping.
 */
import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Plus, X, MapPin, Tag, CheckCircle2, XCircle, FileText, Layers, Circle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';
import EvidenceCaptureModal from './EvidenceCaptureModal';
import LabelerModal from './LabelerModal';
import {
  assignEvidenceToRequirements,
  getEvidenceStatusPresentation,
  groupEvidenceByStepOrJob,
  partitionEvidenceForRequirements,
  resolveRunbookStepTitle,
  getStorageNoteForFileUrl,
} from '@/lib/fieldEvidenceViewModel';
import {
  BTN_PRIMARY,
  FIELD_BODY,
  FIELD_CARD,
  FIELD_CTRL_H,
  FIELD_OVERLINE,
} from '@/lib/fieldVisualTokens';

const QC_CFG = {
  pass: { bg: 'bg-emerald-500', label: 'Pass' },
  fail: { bg: 'bg-red-500', label: 'Fail' },
  unknown: { bg: 'bg-slate-400', label: '—' },
};

function fmtTs(ts) {
  try {
    return format(parseISO(ts), 'MMM d HH:mm');
  } catch {
    return ts || '—';
  }
}

function EvidenceRequirementsPanel({ job, evidence, onAddForRequirement }) {
  const reqs = job?.evidence_requirements;
  const rows = partitionEvidenceForRequirements(job, evidence);

  if (!Array.isArray(reqs) || reqs.length === 0) {
    return (
      <p className="text-xs text-slate-500 mb-4 leading-relaxed">
        No structured evidence requirements are configured for this work order yet. Each item you add is still labeled
        by type and optional runbook step so it stays traceable.
      </p>
    );
  }

  return (
    <div className={cn(FIELD_CARD, 'p-4 mb-4')}>
      <p className={cn(FIELD_OVERLINE, 'mb-3')}>
        Required vs uploaded
      </p>
      <ul className="space-y-2">
        {rows.map(({ req, min, uploaded, inFlight, met, unmet }, i) => (
          <li
            key={i}
            className={cn(
              'flex flex-col gap-2 rounded-lg px-3 py-2.5 border text-xs',
              met ? 'bg-emerald-50 border-emerald-100 text-emerald-900' : 'bg-amber-50/80 border-amber-100 text-amber-950',
            )}
          >
            <div className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-2 font-semibold min-w-0">
                {met ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0" aria-hidden />
                ) : (
                  <Circle className="h-4 w-4 text-amber-500 flex-shrink-0" aria-hidden />
                )}
                <span className="truncate capitalize">{req.label || req.type?.replace(/_/g, ' ')}</span>
              </span>
              <span className="font-mono tabular-nums text-[11px] font-bold flex-shrink-0">
                {uploaded}/{min}
              </span>
            </div>
            <div className="flex items-center justify-between gap-2 pl-6">
              <span className="text-[10px] text-slate-600">
                {inFlight > 0 && (
                  <span className="font-semibold text-amber-800">{inFlight} not finished (upload/sync) · </span>
                )}
                {!met && <span className="text-amber-900 font-medium">{unmet} more needed</span>}
                {met && inFlight === 0 && <span className="text-emerald-800">Requirement met</span>}
              </span>
              <button
                type="button"
                onClick={() => onAddForRequirement?.(req.type)}
                className={cn(BTN_PRIMARY, 'h-7 min-h-0 px-2.5 text-[10px] flex-shrink-0')}
              >
                Add
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Thumbnail({ ev, job, onClick }) {
  const isImg = ev.content_type?.startsWith('image');
  const qc = QC_CFG[ev.qc_status] || QC_CFG.unknown;
  const st = getEvidenceStatusPresentation(ev);
  const stepTitle = resolveRunbookStepTitle(job, ev.runbook_step_id);

  return (
    <button
      type="button"
      onClick={() => onClick(ev)}
      className="relative rounded-xl overflow-hidden bg-slate-100 border border-slate-200 hover:border-slate-400 transition-all aspect-square flex items-center justify-center"
    >
      {isImg ? (
        <img src={ev.file_url || ev.thumbnail_url} alt="evidence" className="h-full w-full object-cover" />
      ) : (
        <FileText className="h-8 w-8 text-slate-400" />
      )}
      <span
        className={cn('absolute top-1.5 right-1.5 h-2.5 w-2.5 rounded-full border-2 border-white', qc.bg)}
        title={`QC: ${qc.label}`}
      />
      {st.tone !== 'ok' && (
        <span
          className={cn(
            'absolute top-1.5 left-1.5 max-w-[85%] truncate rounded px-1 py-0.5 text-[8px] font-bold text-white shadow-sm',
            st.tone === 'error' ? 'bg-red-600' : st.tone === 'pending' ? 'bg-amber-600' : 'bg-slate-600',
          )}
          title={st.label}
        >
          {st.shortLabel}
        </span>
      )}
      {ev.runbook_step_id && (
        <span
          className="absolute bottom-1 left-1 bg-black/55 text-white text-[8px] font-bold px-1 rounded max-w-[90%] truncate"
          title={ev.runbook_step_id}
        >
          {stepTitle || ev.runbook_step_id}
        </span>
      )}
      {ev.geo_lat && (
        <span className="absolute bottom-1 right-1 text-white">
          <MapPin className="h-2.5 w-2.5 drop-shadow" />
        </span>
      )}
    </button>
  );
}

function ExifRow({ label, value }) {
  if (!value && value !== 0) return null;
  return (
    <tr className="border-b border-slate-50">
      <td className={cn('py-1.5 pr-3 whitespace-nowrap', FIELD_OVERLINE)}>
        {label}
      </td>
      <td className="py-1.5 text-xs text-slate-700 font-mono">{String(value)}</td>
    </tr>
  );
}

function DetailModal({ ev, job, onClose, onLabel, onQC }) {
  const exif = ev.exif_metadata || {};
  const hasGeo = ev.geo_lat != null;
  const isImg = ev.content_type?.startsWith('image');
  const qc = QC_CFG[ev.qc_status] || QC_CFG.unknown;
  const st = getEvidenceStatusPresentation(ev);
  const stepTitle = resolveRunbookStepTitle(job, ev.runbook_step_id);
  const storageNote = getStorageNoteForFileUrl(ev.file_url);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end md:items-center md:justify-center"
      role="dialog"
      aria-modal="true"
    >
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-white rounded-t-3xl md:rounded-2xl shadow-2xl max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 pt-5 pb-3 sticky top-0 bg-white border-b border-slate-50 z-10">
          <h2 className="text-sm font-bold text-slate-900 truncate flex-1">Evidence Detail</h2>
          <button
            type="button"
            onClick={onClose}
            className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0 ml-2"
          >
            <X className="h-4 w-4 text-slate-600" />
          </button>
        </div>

        <div className="px-5 pb-10 space-y-4 mt-3">
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

          <div className="flex items-center gap-3 flex-wrap">
            <div className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold text-white', qc.bg)}>
              {qc.label === 'Pass' ? (
                <CheckCircle2 className="h-3.5 w-3.5" />
              ) : qc.label === 'Fail' ? (
                <XCircle className="h-3.5 w-3.5" />
              ) : (
                <Layers className="h-3.5 w-3.5" />
              )}
              QC: {qc.label}
            </div>
            <div
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border',
                st.tone === 'ok' && 'bg-emerald-50 border-emerald-200 text-emerald-900',
                st.tone === 'pending' && 'bg-amber-50 border-amber-200 text-amber-950',
                st.tone === 'error' && 'bg-red-50 border-red-200 text-red-900',
                st.tone === 'muted' && 'bg-slate-50 border-slate-200 text-slate-700',
              )}
            >
              Record: {st.shortLabel}
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <button
              type="button"
              onClick={() => onQC(ev, 'pass')}
              className={cn('px-3 bg-emerald-50 text-emerald-700 text-xs font-bold hover:bg-emerald-100 flex items-center gap-1 rounded-xl', FIELD_CTRL_H)}
            >
              <CheckCircle2 className="h-3.5 w-3.5" /> Pass
            </button>
            <button
              type="button"
              onClick={() => onQC(ev, 'fail')}
              className={cn('px-3 bg-red-50 text-red-700 text-xs font-bold hover:bg-red-100 flex items-center gap-1 rounded-xl', FIELD_CTRL_H)}
            >
              <XCircle className="h-3.5 w-3.5" /> Fail
            </button>
            <button
              type="button"
              onClick={() => onLabel(ev)}
              className={cn(BTN_PRIMARY, 'px-3 text-xs flex items-center gap-1 ml-auto', FIELD_CTRL_H)}
            >
              <Tag className="h-3.5 w-3.5" /> Label
            </button>
          </div>

          {storageNote && (
            <p className={cn(FIELD_BODY, 'bg-slate-50 border border-slate-200/80 rounded-xl px-3 py-2')}>
              {storageNote}
            </p>
          )}

          <div>
            <p className={cn(FIELD_OVERLINE, 'mb-2')}>Metadata</p>
            <table className="w-full">
              <tbody>
                <ExifRow label="Type" value={ev.evidence_type} />
                <ExifRow label="Save status" value={st.label} />
                <ExifRow label="Captured" value={fmtTs(ev.captured_at)} />
                <ExifRow label="Size" value={ev.size_bytes ? `${(ev.size_bytes / 1024).toFixed(0)} KB` : null} />
                <ExifRow label="MIME" value={ev.content_type} />
                <ExifRow label="Step" value={stepTitle || ev.runbook_step_id || null} />
                <ExifRow label="SHA-256" value={ev.sha256 ? ev.sha256.slice(0, 20) + '…' : null} />
                {hasGeo && <ExifRow label="Latitude" value={ev.geo_lat?.toFixed(5)} />}
                {hasGeo && <ExifRow label="Longitude" value={ev.geo_lon?.toFixed(5)} />}
                {hasGeo && (
                  <ExifRow label="Altitude" value={ev.geo_altitude_m != null ? `${ev.geo_altitude_m} m` : null} />
                )}
                {hasGeo && (
                  <ExifRow label="Accuracy" value={ev.geo_accuracy_m != null ? `±${ev.geo_accuracy_m} m` : null} />
                )}
                {exif.make && <ExifRow label="Camera" value={`${exif.make} ${exif.model}`} />}
                {exif.iso && <ExifRow label="ISO" value={exif.iso} />}
                {exif.focal_mm && <ExifRow label="Focal" value={`${exif.focal_mm} mm`} />}
                {exif.exposure_s && <ExifRow label="Exposure" value={`1/${Math.round(1 / exif.exposure_s)}s`} />}
                {exif.width_px && (
                  <ExifRow label="Resolution" value={`${exif.width_px}×${exif.height_px}`} />
                )}
              </tbody>
            </table>
          </div>

          {hasGeo && (
            <div>
              <p className={cn(FIELD_OVERLINE, 'mb-2')}>Location</p>
              <a
                href={`https://maps.google.com/?q=${ev.geo_lat},${ev.geo_lon}`}
                target="_blank"
                rel="noopener noreferrer"
                className={cn('flex items-center gap-2 px-3 bg-blue-50 text-blue-700 text-xs font-bold hover:bg-blue-100 rounded-xl', FIELD_CTRL_H)}
              >
                <MapPin className="h-3.5 w-3.5" />
                {ev.geo_lat?.toFixed(5)}, {ev.geo_lon?.toFixed(5)} — Open in Maps
              </a>
            </div>
          )}

          {ev.notes && (
            <div>
              <p className={cn(FIELD_OVERLINE, 'mb-1')}>Notes</p>
              <p className="text-xs text-slate-600 leading-relaxed">{ev.notes}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/** Secondary context only — requirement completeness stays primary above and in the gallery buckets. */
function RunbookStepSummary({ job, evidence }) {
  const { stepGroups, jobLevel } = groupEvidenceByStepOrJob(job, evidence);
  if (stepGroups.length === 0 && jobLevel.length === 0) return null;
  const parts = stepGroups.map((g) => `${g.title} (${g.items.length})`);
  if (jobLevel.length > 0) parts.unshift(`Job-level (${jobLevel.length})`);
  if (parts.length === 0) return null;
  return (
    <p className="text-[11px] text-slate-500 leading-snug border-t border-slate-100 pt-3 mt-1">
      <span className="text-slate-400">Optional runbook links — </span>
      {parts.join(' · ')}
    </p>
  );
}

export default function EvidenceGalleryView({ job, evidence, labels: _labels, adapters, onRefresh }) {
  const [showCapture, setShowCapture] = useState(false);
  const [captureFocus, setCaptureFocus] = useState({ evidenceType: null, stepId: null });
  const [captureNonce, setCaptureNonce] = useState(0);
  const [selectedEv, setSelectedEv] = useState(null);
  const [labelerTarget, setLabelerTarget] = useState(null);
  const qc = useQueryClient();

  const qcMutation = useMutation({
    mutationFn: ({ id, verdict }) => base44.entities.Evidence.update(id, { qc_status: verdict }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['fj-evidence', job.id] });
      onRefresh?.();
    },
  });

  const handleQC = (ev, verdict) => {
    qcMutation.mutate({ id: ev.id, verdict });
    setSelectedEv(null);
  };

  const handleLabel = (ev) => {
    setSelectedEv(null);
    setLabelerTarget(ev);
  };

  const openCapture = (opts = {}) => {
    setCaptureFocus({ evidenceType: opts.evidenceType ?? null, stepId: opts.stepId ?? null });
    setCaptureNonce((n) => n + 1);
    setShowCapture(true);
  };

  const hasReqs = Array.isArray(job?.evidence_requirements) && job.evidence_requirements.length > 0;
  const { rows: reqRows, other } = assignEvidenceToRequirements(job, evidence);

  const gallerySections = hasReqs
    ? [
        ...reqRows.map(({ req, items }) => ({
          key: `req-${req.type}`,
          title: (req.label || req.type || '').replace(/_/g, ' '),
          subtitle: `${items.length} attached`,
          items,
        })),
        ...(other.length > 0
          ? [{ key: 'other', title: 'Other evidence', subtitle: `${other.length} items`, items: other }]
          : []),
      ]
    : Object.entries(
        evidence.reduce((acc, e) => {
          const t = e.evidence_type || 'general';
          if (!acc[t]) acc[t] = [];
          acc[t].push(e);
          return acc;
        }, {}),
      ).map(([type, items]) => ({
        key: `type-${type}`,
        title: type.replace(/_/g, ' '),
        subtitle: `${items.length}`,
        items,
      }));

  return (
    <div className="space-y-4">
      <div>
        <p className={cn(FIELD_OVERLINE, 'mb-1')}>Evidence for this job</p>
        <EvidenceRequirementsPanel job={job} evidence={evidence} onAddForRequirement={(type) => openCapture({ evidenceType: type })} />
      </div>

      <button
        type="button"
        onClick={() => openCapture({})}
        className="w-full h-11 rounded-xl border-2 border-dashed border-slate-300 text-slate-500 text-sm font-semibold flex items-center justify-center gap-2 hover:border-slate-500 hover:text-slate-700 transition-colors"
      >
        <Plus className="h-4 w-4" /> Add Evidence
      </button>

      {!hasReqs && evidence.length > 0 && (
        <p className="text-[11px] text-slate-500">
          Showing items by evidence type. Link items to runbook steps when you capture (if this job has embedded
          steps).
        </p>
      )}

      {gallerySections.map((section) => (
        <div key={section.key}>
          <p className={cn(FIELD_OVERLINE, 'mb-2 capitalize')}>
            {section.title}{' '}
            <span className="font-normal text-slate-300 normal-case">({section.subtitle})</span>
          </p>
          {section.items.length === 0 ? (
            <p className="text-xs text-slate-400 py-2 pl-0.5">No items in this bucket yet.</p>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {section.items.map((ev) => (
                <Thumbnail key={ev.id} ev={ev} job={job} onClick={setSelectedEv} />
              ))}
            </div>
          )}
        </div>
      ))}

      {evidence.length === 0 && (
        <div className="py-16 text-center text-slate-400 text-sm">
          No evidence yet — tap Add Evidence to choose type and optional runbook step.
        </div>
      )}

      {evidence.length > 0 && <RunbookStepSummary job={job} evidence={evidence} />}

      {showCapture && (
        <EvidenceCaptureModal
          key={captureNonce}
          jobId={job.id}
          job={job}
          initialEvidenceType={captureFocus.evidenceType}
          initialRunbookStepId={captureFocus.stepId}
          adapter={adapters?.upload}
          onClose={() => setShowCapture(false)}
          onSuccess={() => {
            setShowCapture(false);
            onRefresh?.();
          }}
        />
      )}
      {selectedEv && (
        <DetailModal
          ev={selectedEv}
          job={job}
          onClose={() => setSelectedEv(null)}
          onLabel={handleLabel}
          onQC={handleQC}
        />
      )}
      {labelerTarget && (
        <LabelerModal
          evidence={labelerTarget}
          jobId={job.id}
          adapter={adapters?.label}
          onClose={() => setLabelerTarget(null)}
          onSuccess={() => {
            setLabelerTarget(null);
            onRefresh?.();
          }}
        />
      )}
    </div>
  );
}
