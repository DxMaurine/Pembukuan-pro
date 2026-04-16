import React, { useRef, useEffect, useState, useCallback } from 'react';
import { X, Pipette } from 'lucide-react';

// ─── Helpers ────────────────────────────────────────────────────────────────

function hexToHsv(hex: string): [number, number, number] {
  let r = 0, g = 0, b = 0;
  const clean = hex.replace('#', '');
  if (clean.length === 6) {
    r = parseInt(clean.slice(0, 2), 16) / 255;
    g = parseInt(clean.slice(2, 4), 16) / 255;
    b = parseInt(clean.slice(4, 6), 16) / 255;
  }
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const d = max - min;
  let h = 0;
  if (d !== 0) {
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h = Math.round(h * 60);
    if (h < 0) h += 360;
  }
  const s = max === 0 ? 0 : d / max;
  const v = max;
  return [h, s, v];
}

function hsvToHex(h: number, s: number, v: number): string {
  const f = (n: number) => {
    const k = (n + h / 60) % 6;
    return v - v * s * Math.max(0, Math.min(k, 4 - k, 1));
  };
  const toHex = (x: number) => Math.round(x * 255).toString(16).padStart(2, '0');
  return `#${toHex(f(5))}${toHex(f(3))}${toHex(f(1))}`;
}

function hueToHex(h: number): string {
  return hsvToHex(h, 1, 1);
}

// ─── Quick swatches (curated palette) ────────────────────────────────────────

const SWATCHES = [
  '#f43f5e', '#ef4444', '#f97316', '#f59e0b', '#eab308',
  '#84cc16', '#22c55e', '#10b981', '#14b8a6', '#06b6d4',
  '#0ea5e9', '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7',
  '#ec4899', '#64748b', '#475569', '#1e293b', '#ffffff',
];

// ─── Props ───────────────────────────────────────────────────────────────────

interface ColorPickerModalProps {
  value: string;          // current hex color
  onChange: (hex: string) => void;
  onClose: () => void;
}

// ─── Component ───────────────────────────────────────────────────────────────

const ColorPickerModal: React.FC<ColorPickerModalProps> = ({ value, onChange, onClose }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const hueRef   = useRef<HTMLDivElement>(null);

  // Internal state — derived from `value` on mount
  const [hsv, setHsv] = useState<[number, number, number]>(() => hexToHsv(value || '#f43f5e'));
  const [hexInput, setHexInput] = useState(value || '#f43f5e');
  const [draggingCanvas, setDraggingCanvas] = useState(false);
  const [draggingHue, setDraggingHue]       = useState(false);

  const [h, s, v] = hsv;

  // Sync output whenever hsv changes
  useEffect(() => {
    const hex = hsvToHex(h, s, v);
    setHexInput(hex);
    onChange(hex);
  }, [h, s, v]);

  // ── Draw gradient canvas ──────────────────────────────────────────────────
  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    const { width, height } = canvas;

    // White → hue gradient (horizontal)
    const gradH = ctx.createLinearGradient(0, 0, width, 0);
    gradH.addColorStop(0, 'white');
    gradH.addColorStop(1, hueToHex(h));
    ctx.fillStyle = gradH;
    ctx.fillRect(0, 0, width, height);

    // Transparent → black gradient (vertical)
    const gradV = ctx.createLinearGradient(0, 0, 0, height);
    gradV.addColorStop(0, 'rgba(0,0,0,0)');
    gradV.addColorStop(1, 'black');
    ctx.fillStyle = gradV;
    ctx.fillRect(0, 0, width, height);
  }, [h]);

  useEffect(() => { drawCanvas(); }, [drawCanvas]);


  // ── Canvas pointer handler ────────────────────────────────────────────────
  const handleCanvasPointer = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const nx = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const ny = Math.max(0, Math.min(1, (e.clientY - rect.top)  / rect.height));
    setHsv([h, nx, 1 - ny]);
  }, [h]);

  // ── Hue slider handler ────────────────────────────────────────────────────
  const handleHuePointer = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const el = hueRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const nx = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    setHsv([Math.round(nx * 360), s, v]);
  }, [s, v]);

  // ── Hex input ─────────────────────────────────────────────────────────────
  const handleHexInput = (raw: string) => {
    setHexInput(raw);
    const clean = raw.startsWith('#') ? raw : `#${raw}`;
    if (/^#[0-9a-fA-F]{6}$/.test(clean)) {
      setHsv(hexToHsv(clean));
    }
  };

  const currentHex = hsvToHex(h, s, v);

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onPointerDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="glass-card w-[320px] p-6 relative animate-scale-up shadow-2xl">
        {/* Close */}
        <button
          onClick={onClose}
          className="btn absolute top-4 right-4 p-1.5 shadow-none bg-transparent hover:bg-white/10"
        >
          <X size={16} />
        </button>

        <h3 className="text-sm font-bold uppercase tracking-widest text-muted mb-4 flex items-center gap-2">
          <Pipette size={14} className="text-primary" /> Pilih Warna Aksen
        </h3>

        {/* ── Gradient Canvas ── */}
        <div className="relative mb-3 rounded-xl overflow-hidden" style={{ height: 160 }}>
          <canvas
            ref={canvasRef}
            width={272}
            height={160}
            className="w-full h-full cursor-crosshair block"
            onPointerDown={(e) => { setDraggingCanvas(true); e.currentTarget.setPointerCapture(e.pointerId); handleCanvasPointer(e); }}
            onPointerMove={(e) => { if (draggingCanvas) handleCanvasPointer(e); }}
            onPointerUp={() => setDraggingCanvas(false)}
          />
          {/* Cursor dot */}
          <div
            className="absolute w-4 h-4 rounded-full border-2 border-white shadow-md pointer-events-none -translate-x-1/2 -translate-y-1/2"
            style={{
              left: `${s * 100}%`,
              top:  `${(1 - v) * 100}%`,
              backgroundColor: currentHex,
            }}
          />
        </div>

        {/* ── Hue Slider ── */}
        <div className="mb-4 relative">
          <div
            ref={hueRef}
            className="h-4 rounded-full cursor-pointer relative select-none"
            style={{
              background: 'linear-gradient(to right, #f00,#ff0,#0f0,#0ff,#00f,#f0f,#f00)',
            }}
            onPointerDown={(e) => { setDraggingHue(true); e.currentTarget.setPointerCapture(e.pointerId); handleHuePointer(e); }}
            onPointerMove={(e) => { if (draggingHue) handleHuePointer(e); }}
            onPointerUp={() => setDraggingHue(false)}
          >
            {/* Thumb */}
            <div
              className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-5 h-5 rounded-full border-2 border-white shadow-md pointer-events-none"
              style={{ left: `${(h / 360) * 100}%`, backgroundColor: hueToHex(h) }}
            />
          </div>
        </div>

        {/* ── Preview + Hex Input ── */}
        <div className="flex items-center gap-3 mb-4">
          <div
            className="w-12 h-10 rounded-xl border-2 border-white/20 shadow-inner shrink-0"
            style={{ backgroundColor: currentHex }}
          />
          <div className="flex-1 relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted text-sm font-mono">#</span>
            <input
              type="text"
              className="form-input pl-7 py-2 text-sm font-mono uppercase"
              value={hexInput.replace('#', '')}
              maxLength={7}
              onChange={(e) => handleHexInput(`#${e.target.value}`)}
              onBlur={() => {
                const clean = hexInput.startsWith('#') ? hexInput : `#${hexInput}`;
                if (!/^#[0-9a-fA-F]{6}$/.test(clean)) setHexInput(currentHex);
              }}
            />
          </div>
        </div>

        {/* ── Quick Swatches ── */}
        <div>
          <label className="text-[10px] font-bold uppercase tracking-widest text-muted block mb-2">Pilihan Cepat:</label>
          <div className="grid grid-cols-10 gap-1.5">
            {SWATCHES.map((sw) => (
              <button
                key={sw}
                title={sw}
                onClick={() => { setHsv(hexToHsv(sw)); }}
                className="w-6 h-6 rounded-md border-2 transition-transform hover:scale-125 hover:z-10 relative"
                style={{
                  backgroundColor: sw,
                  borderColor: currentHex === sw ? 'white' : 'transparent',
                  boxShadow: currentHex === sw ? `0 0 0 2px ${sw}` : undefined,
                }}
              />
            ))}
          </div>
        </div>

        {/* ── Apply Button ── */}
        <button
          className="btn btn-primary w-full justify-center py-3 mt-5 rounded-xl font-bold tracking-wide shadow-lg shadow-primary/20"
          onClick={onClose}
        >
          Terapkan Warna
        </button>
      </div>
    </div>
  );
};

export default ColorPickerModal;
