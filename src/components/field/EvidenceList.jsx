import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { MoreVertical, Eye, RotateCcw, Trash2, AlertCircle, CheckCircle2, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import EvidenceDetailSheet from './EvidenceDetailSheet';

const QC_STATUS_CONFIG = {
  pending:  { label: 'Pending', bg: 'bg-slate-100', text: 'text-slate-600', icon: Clock },
  approved: { label: 'Approved', bg: 'bg-emerald-100', text: 'text-emerald-600', icon: CheckCircle2 },
  rejected: { label: 'Failed', bg: 'bg-red-100', text: 'text-red-600', icon: AlertCircle },
};

const STATUS_CONFIG = {
  pending_upload: { label: 'Queued', color: 'text-slate-400' },
  uploading:      { label: 'Uploading', color: 'text-blue-500' },
  uploaded:       { label: 'Uploaded', color: 'text-emerald-500' },
  error:          { label: 'Error', color: 'text-red-500' },
  replaced:       { label: 'Replaced', color: 'text-slate-400' },
};

export default function EvidenceList({ items = [], jobId, onCaptureClick }) {
  const [selectedId, setSelectedId] = useState(null);
  const queryClient = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Evidence.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['evidence', jobId] });
    },
  });

  const retakeMutation = useMutation({
    mutationFn: (id) => base44.entities.Evidence.update(id, { status: 'replaced' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['evidence', jobId] });
    },
  });

  const handleDelete = (id) => {
    if (confirm('Delete this evidence?')) {
      deleteMutation.mutate(id);
    }
  };

  const handleRetake = (id) => {
    retakeMutation.mutate(id);
  };

  const selected = items.find(e => e.id === selectedId);

  if (items.length === 0) {
    return (
      <div className="flex items-center justify-center py-6 text-center">
        <div>
          <p className="text-sm text-slate-400 mb-3">No evidence captured yet</p>
          <button
            onClick={onCaptureClick}
            className="h-9 px-4 rounded-md bg-[#0B2D5C] text-white text-sm font-semibold active:opacity-80"
          >
            Capture Evidence
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-1 divide-y divide-slate-50">
        {items.map((item) => {
          const qcCfg = QC_STATUS_CONFIG[item.qc_status] || QC_STATUS_CONFIG.pending;
          const QcIcon = qcCfg.icon;
          const statusCfg = STATUS_CONFIG[item.status] || { label: 'Unknown', color: 'text-slate-400' };

          return (
            <button
              key={item.id}
              onClick={() => setSelectedId(item.id)}
              className="w-full flex items-center gap-2 px-2 py-2 text-left hover:bg-slate-50 transition-colors active:bg-slate-100"
            >
              {/* Thumbnail */}
              {item.file_url ? (
                <img
                  src={item.file_url}
                  alt={item.evidence_type}
                  className="h-12 w-12 rounded-[6px] object-cover flex-shrink-0 bg-slate-100"
                />
              ) : (
                <div className="h-12 w-12 rounded-[6px] bg-slate-100 flex items-center justify-center flex-shrink-0">
                  <span className="text-[10px] font-bold text-slate-400">no img</span>
                </div>
              )}

              {/* Type + Notes */}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-slate-900 capitalize truncate">
                  {item.evidence_type?.replace(/_/g, ' ')}
                </p>
                {item.notes && (
                  <p className="text-[10px] text-slate-400 line-clamp-1">{item.notes}</p>
                )}
                <p className={cn('text-[9px] font-semibold mt-0.5', statusCfg.color)}>
                  {statusCfg.label}
                </p>
              </div>

              {/* QC Badge */}
              <div className={cn('flex items-center gap-0.5 px-2 py-1 rounded-[4px] flex-shrink-0', qcCfg.bg)}>
                <QcIcon className={cn('h-3 w-3', qcCfg.text)} />
                <span className={cn('text-[9px] font-bold', qcCfg.text)}>{qcCfg.label}</span>
              </div>

              {/* Time + Menu */}
              <div className="flex items-center gap-1 flex-shrink-0">
                <span className="text-[9px] text-slate-400 font-mono">
                  {item.captured_at ? new Date(item.captured_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                </span>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      className="h-7 w-7 flex items-center justify-center rounded-[4px] hover:bg-slate-200 active:bg-slate-300 transition-colors"
                      aria-label="Evidence options"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <MoreVertical className="h-3.5 w-3.5 text-slate-600" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-40">
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.preventDefault();
                        setSelectedId(item.id);
                      }}
                    >
                      <Eye className="h-3.5 w-3.5 mr-2" /> View Details
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.preventDefault();
                        handleRetake(item.id);
                      }}
                    >
                      <RotateCcw className="h-3.5 w-3.5 mr-2" /> Retake
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.preventDefault();
                        handleDelete(item.id);
                      }}
                      className="text-red-600"
                    >
                      <Trash2 className="h-3.5 w-3.5 mr-2" /> Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </button>
          );
        })}
      </div>

      {/* Details Drawer */}
      {selected && (
        <EvidenceDetailSheet
          evidence={selected}
          isOpen={!!selectedId}
          onClose={() => setSelectedId(null)}
        />
      )}
    </>
  );
}