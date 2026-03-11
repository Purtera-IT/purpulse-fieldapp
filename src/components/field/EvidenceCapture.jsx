import React, { useRef, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Camera, Image as ImageIcon, Upload, Loader2, X, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { v4 as uuidV4 } from 'lodash';

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

export default function EvidenceCapture({ jobId, evidenceType, stepId, onCaptured }) {
  const [preview, setPreview] = useState(null);
  const [file, setFile] = useState(null);
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const queryClient = useQueryClient();

  const uploadMutation = useMutation({
    mutationFn: async (selectedFile) => {
      const { file_url } = await base44.integrations.Core.UploadFile({ file: selectedFile });

      const evidence = await base44.entities.Evidence.create({
        job_id: jobId,
        evidence_type: evidenceType,
        file_url: file_url,
        content_type: selectedFile.type,
        size_bytes: selectedFile.size,
        captured_at: new Date().toISOString(),
        status: 'uploaded',
        runbook_step_id: stepId || '',
        notes: '',
      });

      return evidence;
    },
    onSuccess: (evidence) => {
      queryClient.invalidateQueries({ queryKey: ['evidence', jobId] });
      setPreview(null);
      setFile(null);
      toast.success('Evidence uploaded');
      onCaptured?.(evidence);
    },
    onError: (err) => {
      toast.error('Upload failed: ' + (err.message || 'Unknown error'));
    },
  });

  const handleFileSelect = (e) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    setFile(selected);
    const reader = new FileReader();
    reader.onload = (ev) => setPreview(ev.target.result);
    reader.readAsDataURL(selected);
  };

  const handleUpload = () => {
    if (file) uploadMutation.mutate(file);
  };

  return (
    <div className="space-y-3">
      {preview ? (
        <div className="relative rounded-xl overflow-hidden bg-slate-100">
          <img src={preview} alt="Preview" className="w-full h-48 object-cover" />
          <button
            onClick={() => { setPreview(null); setFile(null); }}
            className="absolute top-2 right-2 h-7 w-7 rounded-full bg-black/50 flex items-center justify-center"
          >
            <X className="h-4 w-4 text-white" />
          </button>
        </div>
      ) : (
        <div className="flex gap-2">
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handleFileSelect}
          />
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*"
            className="hidden"
            onChange={handleFileSelect}
          />
          <Button
            variant="outline"
            className="flex-1 h-20 flex-col gap-1 rounded-xl border-dashed border-2 border-slate-200"
            onClick={() => cameraInputRef.current?.click()}
          >
            <Camera className="h-5 w-5 text-slate-400" />
            <span className="text-xs text-slate-500">Camera</span>
          </Button>
          <Button
            variant="outline"
            className="flex-1 h-20 flex-col gap-1 rounded-xl border-dashed border-2 border-slate-200"
            onClick={() => fileInputRef.current?.click()}
          >
            <ImageIcon className="h-5 w-5 text-slate-400" />
            <span className="text-xs text-slate-500">Gallery</span>
          </Button>
        </div>
      )}

      {preview && (
        <Button
          onClick={handleUpload}
          disabled={uploadMutation.isPending}
          className="w-full rounded-xl bg-slate-900 hover:bg-slate-800"
        >
          {uploadMutation.isPending ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Uploading...
            </>
          ) : (
            <>
              <Upload className="h-4 w-4 mr-2" />
              Upload Evidence
            </>
          )}
        </Button>
      )}
    </div>
  );
}