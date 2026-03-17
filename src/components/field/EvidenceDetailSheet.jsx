import React from 'react';
import { X, AlertCircle, CheckCircle2, Clock, MapPin, User } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetClose,
} from '@/components/ui/sheet';
import { cn } from '@/lib/utils';

const QC_STATUS_CONFIG = {
  pending:  { label: 'Pending QC', color: 'text-slate-600', bg: 'bg-slate-100' },
  approved: { label: 'Approved', color: 'text-emerald-600', bg: 'bg-emerald-100' },
  rejected: { label: 'Failed QC', color: 'text-red-600', bg: 'bg-red-100' },
};

export default function EvidenceDetailSheet({ evidence, isOpen, onClose }) {
  const qcCfg = QC_STATUS_CONFIG[evidence?.qc_status] || QC_STATUS_CONFIG.pending;
  const capturedAt = evidence?.captured_at ? new Date(evidence.captured_at) : null;
  const exif = evidence?.exif_metadata || {};

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="bottom" className="h-[85vh] rounded-t-2xl flex flex-col">
        
        <SheetHeader className="flex items-start justify-between">
          <div>
            <SheetTitle className="text-base font-black text-slate-900 capitalize">
              {evidence?.evidence_type?.replace(/_/g, ' ')}
            </SheetTitle>
            <p className="text-[10px] text-slate-400 mt-0.5">
              {capturedAt?.toLocaleString()}
            </p>
          </div>
          <SheetClose className="h-7 w-7 rounded-md hover:bg-slate-100 flex items-center justify-center">
            <X className="h-4 w-4" />
          </SheetClose>
        </SheetHeader>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto space-y-3 py-4">

          {/* Image */}
          {evidence?.file_url && (
            <div className="rounded-[8px] overflow-hidden bg-slate-100 flex items-center justify-center" style={{ aspectRatio: '4/3' }}>
              <img
                src={evidence.file_url}
                alt={evidence.evidence_type}
                className="w-full h-full object-cover"
              />
            </div>
          )}

          {/* QC Status */}
          <div className={cn('px-3 py-2.5 rounded-[8px] flex items-start gap-3', qcCfg.bg)}>
            <div className={cn('h-5 w-5 flex items-center justify-center rounded flex-shrink-0 mt-0.5', 
              evidence?.qc_status === 'approved' ? 'bg-emerald-300' : 
              evidence?.qc_status === 'rejected' ? 'bg-red-300' : 
              'bg-slate-300'
            )}>
              {evidence?.qc_status === 'approved' ? <CheckCircle2 className="h-4 w-4 text-emerald-700" /> :
               evidence?.qc_status === 'rejected' ? <AlertCircle className="h-4 w-4 text-red-700" /> :
               <Clock className="h-4 w-4 text-slate-700" />}
            </div>
            <div>
              <p className={cn('text-sm font-bold', qcCfg.color)}>{qcCfg.label}</p>
              {evidence?.reviewed_at && (
                <p className="text-[10px] text-slate-600 mt-0.5">
                  Reviewed by {evidence.reviewed_by} on {new Date(evidence.reviewed_at).toLocaleDateString()}
                </p>
              )}
              {evidence?.notes && (
                <p className="text-[10px] text-slate-600 mt-1 italic">{evidence.notes}</p>
              )}
            </div>
          </div>

          {/* Location & Camera Info */}
          {(evidence?.geo_lat || exif?.make) && (
            <div className="space-y-2">
              {evidence?.geo_lat && (
                <div className="flex items-start gap-2 px-3 py-2 rounded-[8px] bg-slate-50 border border-slate-100">
                  <MapPin className="h-4 w-4 text-slate-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[10px] text-slate-500 font-semibold">Location</p>
                    <p className="text-xs text-slate-700 font-mono mt-0.5">
                      {evidence.geo_lat.toFixed(6)}, {evidence.geo_lon.toFixed(6)}
                    </p>
                    {evidence?.geo_accuracy_m && (
                      <p className="text-[9px] text-slate-500 mt-0.5">±{evidence.geo_accuracy_m}m accuracy</p>
                    )}
                  </div>
                </div>
              )}

              {exif?.make && (
                <div className="flex items-start gap-2 px-3 py-2 rounded-[8px] bg-slate-50 border border-slate-100">
                  <User className="h-4 w-4 text-slate-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[10px] text-slate-500 font-semibold">Camera</p>
                    <p className="text-xs text-slate-700 mt-0.5">
                      {exif.make} {exif.model}
                    </p>
                    {exif.iso && (
                      <p className="text-[9px] text-slate-500 mt-0.5">
                        ISO {exif.iso} · {exif.focal_mm}mm · 1/{Math.round(1/exif.exposure_s)}s
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* OCR Text (if available) */}
          {evidence?.ocr_text && (
            <div className="px-3 py-2 rounded-[8px] bg-slate-50 border border-slate-100">
              <p className="text-[10px] text-slate-500 font-semibold mb-2">Extracted Text</p>
              <p className="text-[11px] text-slate-700 font-mono leading-relaxed whitespace-pre-wrap">
                {evidence.ocr_text}
              </p>
            </div>
          )}

          {/* Face Detection / Redactions (placeholder) */}
          {evidence?.embedding && (
            <div className="px-3 py-2 rounded-[8px] bg-amber-50 border border-amber-100">
              <p className="text-[10px] text-amber-600 font-semibold">
                ℹ Faces may be present — redaction required before export
              </p>
            </div>
          )}

          {/* Metadata */}
          <div className="px-3 py-2 rounded-[8px] bg-slate-50 border border-slate-100 space-y-1">
            <p className="text-[10px] text-slate-500 font-semibold">Metadata</p>
            <div className="text-[10px] text-slate-600 space-y-1 font-mono">
              <p>ID: {evidence?.id?.slice(0, 12)}...</p>
              <p>Type: {evidence?.evidence_type}</p>
              <p>Size: {evidence?.size_bytes ? `${(evidence.size_bytes / 1024 / 1024).toFixed(1)}MB` : '—'}</p>
              <p>Uploaded: {evidence?.captured_at ? new Date(evidence.captured_at).toLocaleString() : '—'}</p>
            </div>
          </div>

        </div>
      </SheetContent>
    </Sheet>
  );
}