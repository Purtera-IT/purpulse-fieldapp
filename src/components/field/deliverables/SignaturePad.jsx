/**
 * SignaturePad — inline canvas-based signature capture.
 * Returns a base64 PNG via onSign(dataUrl).
 */
import React, { useRef, useState, useEffect } from 'react';
import { Trash2, Check } from 'lucide-react';

export default function SignaturePad({ onSign, onCancel }) {
  const canvasRef = useRef(null);
  const drawing   = useRef(false);
  const lastPos   = useRef(null);
  const [hasStrokes, setHasStrokes] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  }, []);

  const getPos = (e, canvas) => {
    const r = canvas.getBoundingClientRect();
    const src = e.touches ? e.touches[0] : e;
    return { x: src.clientX - r.left, y: src.clientY - r.top };
  };

  const start = (e) => {
    e.preventDefault();
    drawing.current = true;
    lastPos.current = getPos(e, canvasRef.current);
  };

  const move = (e) => {
    e.preventDefault();
    if (!drawing.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const pos = getPos(e, canvas);
    ctx.beginPath();
    ctx.moveTo(lastPos.current.x, lastPos.current.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    lastPos.current = pos;
    setHasStrokes(true);
  };

  const end = (e) => { e.preventDefault(); drawing.current = false; };

  const clear = () => {
    const canvas = canvasRef.current;
    canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
    setHasStrokes(false);
  };

  const save = () => {
    if (!hasStrokes) return;
    onSign(canvasRef.current.toDataURL('image/png'));
  };

  return (
    <div className="space-y-2">
      <div className="relative rounded-xl border-2 border-dashed border-slate-300 bg-white overflow-hidden">
        <canvas
          ref={canvasRef}
          width={320} height={130}
          className="w-full touch-none cursor-crosshair"
          onMouseDown={start} onMouseMove={move} onMouseUp={end} onMouseLeave={end}
          onTouchStart={start} onTouchMove={move} onTouchEnd={end}
        />
        {!hasStrokes && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <p className="text-xs text-slate-400 font-semibold">Sign here</p>
          </div>
        )}
        <div className="absolute bottom-0 left-0 right-0 h-px bg-slate-200" />
      </div>
      <div className="flex gap-2">
        <button onClick={onCancel}
          className="flex-1 h-9 rounded-xl border border-slate-200 text-slate-500 text-xs font-semibold active:bg-slate-50">
          Cancel
        </button>
        <button onClick={clear}
          className="h-9 w-9 rounded-xl border border-slate-200 flex items-center justify-center text-slate-400 active:bg-slate-50">
          <Trash2 className="h-4 w-4" />
        </button>
        <button onClick={save} disabled={!hasStrokes}
          className="flex-1 h-9 rounded-xl bg-slate-900 text-white text-xs font-bold disabled:opacity-30 active:opacity-80 flex items-center justify-center gap-1.5">
          <Check className="h-3.5 w-3.5" /> Confirm Signature
        </button>
      </div>
    </div>
  );
}