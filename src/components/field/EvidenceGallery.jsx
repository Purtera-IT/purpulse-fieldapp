import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Trash2, RefreshCw, AlertTriangle, CheckCircle2, Clock, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const STATUS_ICON = {
  pending_upload: Clock,
  uploading: RefreshCw,
  uploaded: CheckCircle2,
  error: AlertTriangle,
  replaced: X,
};

export default function EvidenceGallery({ items, jobId }) {
  const [lightbox, setLightbox] = useState(null);
  const queryClient = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Evidence.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['evidence', jobId] });
      toast.success('Evidence removed');
    },
  });

  if (!items?.length) {
    return (
      <div className="text-center py-8 text-slate-400 text-sm">
        No evidence captured yet
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-3 gap-2">
        {items.filter(i => i.status !== 'replaced').map((item) => {
          const Icon = STATUS_ICON[item.status] || CheckCircle2;
          return (
            <div key={item.id} className="relative group">
              <button
                onClick={() => setLightbox(item)}
                className="w-full aspect-square rounded-xl overflow-hidden bg-slate-100"
              >
                <img
                  src={item.file_url || item.thumbnail_url}
                  alt={item.evidence_type}
                  className="w-full h-full object-cover"
                />
                {item.quality_warning && (
                  <div className="absolute top-1 left-1 bg-amber-500 text-white rounded-full p-0.5">
                    <AlertTriangle className="h-3 w-3" />
                  </div>
                )}
                <div className={cn(
                  'absolute bottom-1 right-1 rounded-full p-0.5',
                  item.status === 'uploaded' ? 'bg-emerald-500' :
                  item.status === 'error' ? 'bg-red-500' :
                  'bg-amber-500'
                )}>
                  <Icon className={cn('h-3 w-3 text-white', item.status === 'uploading' && 'animate-spin')} />
                </div>
              </button>
              {item.status !== 'uploaded' && (
                <button
                  onClick={() => deleteMutation.mutate(item.id)}
                  className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              )}
            </div>
          );
        })}
      </div>

      {lightbox && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4" onClick={() => setLightbox(null)}>
          <button className="absolute top-4 right-4 text-white p-2" onClick={() => setLightbox(null)}>
            <X className="h-6 w-6" />
          </button>
          <img
            src={lightbox.file_url}
            alt={lightbox.evidence_type}
            className="max-w-full max-h-[80vh] rounded-lg object-contain"
            onClick={(e) => e.stopPropagation()}
          />
          <div className="absolute bottom-6 left-0 right-0 text-center text-white text-sm">
            <p className="font-medium capitalize">{lightbox.evidence_type?.replace(/_/g, ' ')}</p>
            {lightbox.captured_at && (
              <p className="text-white/60 text-xs mt-1">
                {format(new Date(lightbox.captured_at), 'MMM d, yyyy h:mm a')}
              </p>
            )}
            {lightbox.quality_warning && (
              <p className="text-amber-400 text-xs mt-1 flex items-center justify-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                {lightbox.quality_warning}
              </p>
            )}
          </div>
        </div>
      )}
    </>
  );
}