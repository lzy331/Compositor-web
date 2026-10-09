import { useState, useEffect, useRef, useMemo } from 'react';
import { useEditorStore } from '@/store/editorStore';
import { applyAdjustment } from '@/engine/filters';
import { renderProject } from '@/engine/renderer';

interface CommandItem {
  label: string;
  keywords?: string;
  run: () => void;
}

export default function CommandPalette() {
  const open = useEditorStore((s) => s.commandPaletteOpen);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setQuery('');
      setSelected(0);
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!useEditorStore.getState().commandPaletteOpen) return;
      if (e.key === 'Escape') {
        e.preventDefault();
        useEditorStore.getState().setCommandPaletteOpen(false);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const commands = useMemo<CommandItem[]>(() => {
    const s = useEditorStore.getState();
    const getProject = () => s.projects.find((p) => p.id === s.activeProjectId);
    const getActiveLayer = () => {
      const p = getProject();
      if (!p || !p.activeLayerId) return null;
      return p.layers.find((l) => l.id === p.activeLayerId) || null;
    };
    const applyToActiveLayer = (settings: Parameters<typeof applyAdjustment>[1], desc: string) => {
      const layer = getActiveLayer();
      if (!layer?.canvas) return;
      const ctx = layer.canvas.getContext('2d');
      if (!ctx) return;
      s.pushHistory(desc);
      const imgData = ctx.getImageData(0, 0, layer.width, layer.height);
      const result = applyAdjustment(imgData, settings);
      ctx.putImageData(result, 0, 0);
    };

    return [
      { label: 'New Project', keywords: 'new create', run: () => s.setDialog('new') },
      { label: 'Open', keywords: 'open file image import', run: () => handleOpenFile() },
      { label: 'Export PNG', keywords: 'export save png', run: () => handleExport('png') },
      { label: 'Export JPEG', keywords: 'export save jpeg jpg', run: () => handleExport('jpeg') },
      { label: 'Undo', keywords: 'undo revert', run: () => s.undo() },
      { label: 'Redo', keywords: 'redo', run: () => s.redo() },
      { label: 'Duplicate Layer', keywords: 'duplicate layer copy', run: () => { const p = getProject(); if (p?.activeLayerId) s.duplicateLayer(p.activeLayerId); } },
      { label: 'Delete Layer', keywords: 'delete layer remove', run: () => { const p = getProject(); if (p?.activeLayerId) s.deleteLayer(p.activeLayerId); } },
      { label: 'Merge Down', keywords: 'merge layer down flatten', run: () => s.mergeDown() },
      { label: 'Flip Horizontal', keywords: 'flip horizontal mirror', run: () => s.flipCanvas('horizontal') },
      { label: 'Flip Vertical', keywords: 'flip vertical mirror', run: () => s.flipCanvas('vertical') },
      { label: 'Rotate 90° CW', keywords: 'rotate clockwise cw', run: () => s.rotateLayer(90) },
      { label: 'Rotate 90° CCW', keywords: 'rotate counter ccw', run: () => s.rotateLayer(-90) },
      { label: 'Levels', keywords: 'levels adjustment', run: () => s.setDialog('levels') },
      { label: 'Curves', keywords: 'curves adjustment brightness', run: () => s.setDialog('curves') },
      { label: 'Hue/Saturation', keywords: 'hsl hue saturation color', run: () => s.setDialog('hsl') },
      { label: 'Invert', keywords: 'invert colors', run: () => applyToActiveLayer({ type: 'invert', params: {} }, 'Invert') },
      { label: 'Black & White', keywords: 'bw black white desaturate grayscale', run: () => applyToActiveLayer({ type: 'bw', params: {} }, 'Black & White') },
      { label: 'Gaussian Blur', keywords: 'blur gaussian filter', run: () => applyToActiveLayer({ type: 'gaussian-blur', params: { radius: 5 } }, 'Gaussian Blur') },
      { label: 'Add Noise', keywords: 'noise grain filter', run: () => applyToActiveLayer({ type: 'noise', params: { amount: 15, monochrome: false } }, 'Add Noise') },
      { label: 'Select All', keywords: 'select all selection', run: () => { const p = getProject(); if (p) s.setSelection({ x: 0, y: 0, width: p.width, height: p.height, type: 'rect' }); } },
      { label: 'Deselect', keywords: 'deselect selection none', run: () => s.setSelection(null) },
      { label: 'Zoom In', keywords: 'zoom in magnify', run: () => { const p = getProject(); if (p) s.setZoom(Math.min(16, p.zoom * 1.25)); } },
      { label: 'Zoom Out', keywords: 'zoom out', run: () => { const p = getProject(); if (p) s.setZoom(Math.max(0.05, p.zoom / 1.25)); } },
      { label: 'Fit Screen', keywords: 'fit screen zoom reset', run: () => s.setZoom(1) },
      { label: 'Toggle Rulers', keywords: 'rulers toggle', run: () => s.toggleRulers() },
      { label: 'Toggle Grid', keywords: 'grid toggle', run: () => s.toggleGrid() },
      { label: 'Fullscreen', keywords: 'fullscreen toggle', run: () => s.toggleFullscreen() },
    ];
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return commands;
    return commands.filter((c) =>
      c.label.toLowerCase().includes(q) || (c.keywords ?? '').toLowerCase().includes(q)
    );
  }, [query, commands]);

  useEffect(() => {
    setSelected(0);
  }, [query]);

  if (!open) return null;

  const runCommand = (cmd: CommandItem) => {
    cmd.run();
    useEditorStore.getState().setCommandPaletteOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelected((n) => Math.min(filtered.length - 1, n + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelected((n) => Math.max(0, n - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const cmd = filtered[selected];
      if (cmd) runCommand(cmd);
    }
  };

  return (
    <div className="modal-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) useEditorStore.getState().setCommandPaletteOpen(false); }}>
      <div className="modal" style={{ minWidth: 420, padding: 0, overflow: 'hidden' }} onMouseDown={(e) => e.stopPropagation()}>
        <div style={{ padding: '12px 16px', borderBottom: '1px solid #333' }}>
          <input
            ref={inputRef}
            className="prop-input"
            style={{ width: '100%', fontSize: 13, padding: '8px 10px' }}
            placeholder="Type a command..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
          />
        </div>
        <div style={{ maxHeight: 320, overflowY: 'auto', padding: '4px 0' }}>
          {filtered.length === 0 && (
            <div style={{ padding: '16px', color: '#888', textAlign: 'center', fontSize: 12 }}>No matching commands</div>
          )}
          {filtered.map((cmd, i) => (
            <div
              key={cmd.label}
              onClick={() => runCommand(cmd)}
              onMouseEnter={() => setSelected(i)}
              style={{
                padding: '8px 16px',
                cursor: 'pointer',
                fontSize: 13,
                background: i === selected ? '#3a5a8a' : 'transparent',
                color: i === selected ? '#fff' : '#e0e0e0',
              }}
            >
              {cmd.label}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function handleOpenFile() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  input.onchange = () => {
    const file = input.files?.[0];
    if (!file) return;
    const img = new Image();
    img.onload = () => {
      const s = useEditorStore.getState();
      s.newProject(img.width, img.height, file.name.replace(/\.[^.]+$/, ''));
      const p = s.projects[s.projects.length - 1];
      const layer = p.layers[0];
      if (layer.canvas) {
        layer.canvas.width = img.width;
        layer.canvas.height = img.height;
        const ctx = layer.canvas.getContext('2d')!;
        ctx.drawImage(img, 0, 0);
        layer.width = img.width;
        layer.height = img.height;
        p.width = img.width;
        p.height = img.height;
      }
    };
    img.src = URL.createObjectURL(file);
  };
  input.click();
}

function handleExport(format: 'png' | 'jpeg') {
  const s = useEditorStore.getState();
  const p = s.projects.find((pr) => pr.id === s.activeProjectId);
  if (!p) return;
  const exportCanvas = document.createElement('canvas');
  exportCanvas.width = p.width;
  exportCanvas.height = p.height;
  const ctx = exportCanvas.getContext('2d')!;
  renderProject(p, ctx, p.width, p.height);
  const link = document.createElement('a');
  link.download = `${p.name}.${format}`;
  link.href = exportCanvas.toDataURL(format === 'jpeg' ? 'image/jpeg' : 'image/png', 0.92);
  link.click();
}
