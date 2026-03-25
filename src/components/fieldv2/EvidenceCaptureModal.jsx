/**
 * EvidenceCaptureModal — Capture, map to requirement type / optional runbook step, save evidence row.
 * Uses adapter.requestUploadToken → adapter.completeUpload (real persistence) + manifest row with honest sync flags.
 */
import React, { useState, useRef, useEffect } from 'react';
import { X, Camera, Images, RotateCw, Upload, CheckCircle2, Loader2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { uuidv4 } from '@/lib/uuid';
import { defaultAdapters } from '@/lib/fieldAdapters';
import {
  buildEvidenceTypeOptions,
  flattenRunbookSteps,
  getStorageNoteForFileUrl,
} from '@/lib/fieldEvidenceViewModel';

async function hashFile(file) {
  const buf = await file.arrayBuffer();
  const hash = await crypto.subtle.digest('SHA-256', buf);
  return Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

function manifestSyncStatusFromToken(token) {
  if (token?.is_simulated_storage === true) return 'pending';
  const u = String(token?.upload_url || '');
  if (/^https:\/\//i.test(u)) return 'synced';
  return 'pending';
}

export default function EvidenceCaptureModal({
  jobId,
  job = null,
  stepId = null,
  initialEvidenceType = null,
  initialRunbookStepId = null,
  adapter = defaultAdapters.upload,
  onClose,
  onSuccess,
}) {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [evType, setEvType] = useState(() => initialEvidenceType || 'general');
  const [selectedStepId, setSelectedStepId] = useState(() => initialRunbookStepId ?? stepId ?? '');
  const [notes, setNotes] = useState('');
  const [phase, setPhase] = useState('select'); // select | preview | saving | done | error
  const [errorMessage, setErrorMessage] = useState('');
  const [manifestWarning, setManifestWarning] = useState(null);
  const [doneSummary, setDoneSummary] = useState(null);
  const [rotation, setRotation] = useState(0);
  const inputRef = useRef(null);

  useEffect(() => {
    setEvType(initialEvidenceType || 'general');
    setSelectedStepId(initialRunbookStepId ?? stepId ?? '');
  }, [initialEvidenceType, initialRunbookStepId, stepId]);

  const typeOptions = buildEvidenceTypeOptions(job);
  const runbookSteps = flattenRunbookSteps(job);
  const effectiveRunbookStepId = selectedStepId ? selectedStepId : undefined;

  const handleFile = (f) => {
    if (!f) return;
    setFile(f);
    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target.result);
    reader.readAsDataURL(f);
    setPhase('preview');
  };

  const handleSave = async () => {
    if (!file) return;
    setPhase('saving');
    setErrorMessage('');
    setManifestWarning(null);
    setDoneSummary(null);

    let record;
    try {
      const sha256 = await hashFile(file).catch(() => 'sha256-placeholder-' + uuidv4().slice(0, 8));
      const token = await adapter.requestUploadToken(file, jobId, effectiveRunbookStepId);

      const evidenceId = uuidv4();
      const nowIso = new Date().toISOString();

      const evidenceData = {
        id: evidenceId,
        job_id: jobId,
        evidence_type: evType,
        file_url: preview,
        content_type: file.type,
        size_bytes: file.size,
        sha256,
        captured_at: nowIso,
        // TECHNICAL_DEBT (storage slice): Backend enum uses `uploaded` for “row saved,” not “remote blob
        // confirmed.” Requirement counts treat `uploaded` as complete. When real upload + promotion exists,
        // prefer pending_upload → uploaded (or equivalent) tied to blob lifecycle.
        status: 'uploaded',
        runbook_step_id: effectiveRunbookStepId ?? null,
        notes: notes || undefined,
        approved_for_training: false,
      };

      record = await adapter.completeUpload(token, evidenceData);

      const persistedUrl = record?.file_url || preview;
      const syncStatus = manifestSyncStatusFromToken(token);

      let manifestFailed = false;
      try {
        await adapter.createManifestRow({
          job_id: jobId,
          evidence_id: record.id || evidenceId,
          filename: file.name,
          sha256,
          file_url: persistedUrl,
          azure_blob_url: record?.azure_blob_url || token.upload_url,
          content_type: file.type,
          size_bytes: file.size,
          capture_ts: nowIso,
          upload_ts: nowIso,
          evidence_type: evType,
          runbook_step_id: effectiveRunbookStepId ?? null,
          sync_status: syncStatus,
          azure_indexed: false,
          approved_for_training: false,
        });
      } catch (manifestErr) {
        manifestFailed = true;
        const msg =
          manifestErr instanceof Error ? manifestErr.message : 'Manifest row could not be created.';
        setManifestWarning(msg);
        toast.error('Evidence saved, but manifest log failed', { description: msg });
      }

      const storageNote = getStorageNoteForFileUrl(persistedUrl);
      const detailLine =
        storageNote || (syncStatus === 'pending' ? 'Saved. Storage sync is still pending.' : null);
      setDoneSummary({
        headline: 'Saved to this job',
        detail: detailLine,
      });

      if (!manifestFailed) {
        toast.success('Evidence saved to this job');
      }

      setPhase('done');
      setTimeout(() => onSuccess?.(), 900);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Save failed';
      setErrorMessage(msg);
      setPhase('error');
      toast.error('Could not save evidence', { description: msg });
    }
  };

  const headerTitle =
    phase === 'select'
      ? 'Add Evidence'
      : phase === 'preview'
        ? 'Review'
        : phase === 'saving'
          ? 'Saving…'
          : phase === 'done'
            ? 'Saved'
            : phase === 'error'
              ? 'Save failed'
              : 'Add Evidence';

  return (
    <div className="fixed inset-0 z-50 flex items-end" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative w-full max-w-lg mx-auto bg-white rounded-t-3xl shadow-2xl pb-safe-area overflow-hidden">
        <div className="flex justify-between items-center px-5 pt-5 pb-3">
          <h2 className="text-base font-black text-slate-900">{headerTitle}</h2>
          <button
            type="button"
            onClick={onClose}
            className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center"
          >
            <X className="h-4 w-4 text-slate-600" />
          </button>
        </div>

        <div className="px-5 pb-8 space-y-4">
          {phase === 'select' && (
            <div className="space-y-3">
              <input
                ref={inputRef}
                type="file"
                accept="image/*,video/*,application/pdf"
                className="hidden"
                onChange={(e) => handleFile(e.target.files?.[0])}
              />
              <button
                type="button"
                onClick={() => {
                  inputRef.current.setAttribute('capture', 'environment');
                  inputRef.current.click();
                }}
                className="w-full h-16 rounded-xl bg-slate-900 text-white flex items-center justify-center gap-3 hover:bg-slate-800 active:scale-98 transition"
              >
                <Camera className="h-6 w-6" />
                <div className="text-left">
                  <p className="font-bold text-sm">Camera</p>
                  <p className="text-xs text-white/60">Capture photo or video</p>
                </div>
              </button>
              <button
                type="button"
                onClick={() => {
                  inputRef.current.removeAttribute('capture');
                  inputRef.current.click();
                }}
                className="w-full h-14 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center gap-3 hover:bg-slate-200 active:scale-98 transition"
              >
                <Images className="h-5 w-5 text-slate-500" />
                <div className="text-left">
                  <p className="font-semibold text-sm">Gallery / File</p>
                  <p className="text-xs text-slate-400">Photo, video, or PDF</p>
                </div>
              </button>
            </div>
          )}

          {phase === 'preview' && (
            <div className="space-y-3">
              {preview && file?.type?.startsWith('image') && (
                <div className="relative rounded-xl overflow-hidden bg-slate-100 flex items-center justify-center h-52">
                  <img
                    src={preview}
                    alt="preview"
                    className="h-full w-full object-contain transition-transform"
                    style={{ transform: `rotate(${rotation}deg)` }}
                  />
                  <button
                    type="button"
                    onClick={() => setRotation((r) => (r + 90) % 360)}
                    className="absolute bottom-2 right-2 h-8 w-8 rounded-full bg-black/40 text-white flex items-center justify-center backdrop-blur-sm"
                  >
                    <RotateCw className="h-4 w-4" />
                  </button>
                </div>
              )}
              {!file?.type?.startsWith('image') && (
                <div className="h-20 bg-slate-50 rounded-xl flex items-center justify-center gap-2 text-slate-500 text-sm font-medium">
                  📎 {file?.name}
                </div>
              )}

              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">
                  What is this evidence for?
                </label>
                <select
                  value={evType}
                  onChange={(e) => setEvType(e.target.value)}
                  className="w-full h-9 rounded-lg border border-slate-200 bg-white text-xs font-semibold px-3 focus:outline-none focus:ring-1 focus:ring-slate-400 capitalize"
                >
                  {typeOptions.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>

              {runbookSteps.length > 0 && (
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">
                    Runbook step (optional)
                  </label>
                  <select
                    value={selectedStepId}
                    onChange={(e) => setSelectedStepId(e.target.value)}
                    className="w-full h-9 rounded-lg border border-slate-200 bg-white text-xs font-semibold px-3 focus:outline-none focus:ring-1 focus:ring-slate-400"
                  >
                    <option value="">Job-level (no step)</option>
                    {runbookSteps.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.phaseName ? `${s.phaseName} · ${s.title}` : s.title}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">
                  Notes
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  placeholder="Add context for this evidence…"
                  className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-1 focus:ring-slate-400"
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setFile(null);
                    setPreview(null);
                    setPhase('select');
                  }}
                  className="flex-1 h-10 rounded-xl border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50"
                >
                  Retake
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  className="flex-1 h-10 rounded-xl bg-slate-900 text-white text-sm font-bold flex items-center justify-center gap-2 hover:bg-slate-700"
                >
                  <Upload className="h-4 w-4" /> Save to job
                </button>
              </div>
            </div>
          )}

          {phase === 'saving' && (
            <div className="py-8 flex flex-col items-center gap-4">
              <Loader2 className="h-12 w-12 text-slate-300 animate-spin" />
              <p className="text-sm font-semibold text-slate-800">Saving evidence…</p>
              <p className="text-xs text-slate-500 text-center max-w-xs">
                Saving your evidence to this job. If storage sync is still finishing, you&apos;ll see that on the item
                after it appears in the list.
              </p>
            </div>
          )}

          {phase === 'done' && (
            <div className="py-8 flex flex-col items-center gap-3 px-2">
              <div className="h-14 w-14 rounded-full bg-emerald-50 flex items-center justify-center">
                <CheckCircle2 className="h-8 w-8 text-emerald-500" />
              </div>
              <p className="font-black text-slate-900 text-center">{doneSummary?.headline || 'Saved to this job'}</p>
              {doneSummary?.detail && (
                <p className="text-xs text-slate-500 text-center leading-relaxed">{doneSummary.detail}</p>
              )}
              {manifestWarning && (
                <p className="text-xs text-amber-700 text-center leading-relaxed">
                  Manifest log failed — evidence row should still appear after refresh.
                </p>
              )}
            </div>
          )}

          {phase === 'error' && (
            <div className="py-6 flex flex-col items-center gap-4">
              <div className="h-14 w-14 rounded-full bg-red-50 flex items-center justify-center">
                <AlertCircle className="h-8 w-8 text-red-500" />
              </div>
              <p className="text-sm font-semibold text-slate-900 text-center">Could not save</p>
              <p className="text-xs text-slate-600 text-center max-w-sm">{errorMessage}</p>
              <div className="flex gap-2 w-full">
                <button
                  type="button"
                  onClick={() => setPhase('preview')}
                  className="flex-1 h-10 rounded-xl border border-slate-200 text-slate-700 text-sm font-semibold hover:bg-slate-50"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 h-10 rounded-xl bg-slate-100 text-slate-700 text-sm font-semibold"
                >
                  Close
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
