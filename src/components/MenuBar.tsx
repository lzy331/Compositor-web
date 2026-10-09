import { useState, useRef, useEffect } from 'react';
import { useEditorStore } from '@/store/editorStore';
import type { ToolId } from '@/types';

const MENUS: { label: string; items: { label: string; shortcut?: string; action?: string; divider?: boolean }[] }[] = [
  {
    label: 'File',
    items: [
      { label: 'New', shortcut: 'Ctrl+N', action: 'new' },
      { label: 'Open...', shortcut: 'Ctrl+O', action: 'open' },
      { divider: true, label: '' },
      { label: 'Export PNG', shortcut: 'Ctrl+E', action: 'exportPng' },
      { label: 'Export JPEG', shortcut: 'Ctrl+Shift+E', action: 'exportJpeg' },
    ],
  },
  {
    label: 'Edit',
    items: [
      { label: 'Undo', shortcut: 'Ctrl+Z', action: 'undo' },
      { label: 'Redo', shortcut: 'Ctrl+Shift+Z', action: 'redo' },
      { divider: true, label: '' },
      { label: 'Copy Layer', shortcut: 'Ctrl+C', action: 'copy' },
      { label: 'Paste Layer', shortcut: 'Ctrl+V', action: 'paste' },
    ],
  },
  {
    label: 'Layer',
    items: [
      { label: 'New Layer', shortcut: 'Ctrl+Shift+N', action: 'addLayer' },
      { label: 'Duplicate Layer', shortcut: 'Ctrl+J', action: 'duplicate' },
      { label: 'Delete Layer', shortcut: 'Del', action: 'delete' },
      { divider: true, label: '' },
      { label: 'Merge Down', shortcut: 'Ctrl+E', action: 'mergeDown' },
      { label: 'Add Layer Mask', action: 'addMask' },
    ],
  },
  {
    label: 'Image',
    items: [
      { label: 'Image Size...', action: 'imageSize' },
      { label: 'Canvas Size...', action: 'canvasSize' },
      { divider: true, label: '' },
      { label: 'Adjustments › Levels', action: 'adjust-levels' },
      { label: 'Adjustments › Curves', action: 'adjust-curves' },
      { label: 'Adjustments › Hue/Saturation', action: 'adjust-hsl' },
      { label: 'Adjustments › Invert', action: 'adjust-invert' },
      { label: 'Adjustments › Black & White', action: 'adjust-bw' },
      { divider: true, label: '' },
      { label: 'Blur › Gaussian Blur', action: 'filter-gaussian' },
      { label: 'Blur › Motion Blur', action: 'filter-motion' },
      { label: 'Noise › Add Noise', action: 'filter-noise' },
    ],
  },
  {
    label: 'Select',
    items: [
      { label: 'All', shortcut: 'Ctrl+A', action: 'selectAll' },
      { label: 'Deselect', shortcut: 'Ctrl+D', action: 'deselect' },
    ],
  },
  {
    label: 'View',
    items: [
      { label: 'Zoom In', shortcut: 'Ctrl++', action: 'zoomIn' },
      { label: 'Zoom Out', shortcut: 'Ctrl+-', action: 'zoomOut' },
      { label: 'Fit to Screen', shortcut: 'Ctrl+0', action: 'fitScreen' },
      { divider: true, label: '' },
      { label: 'Rulers', shortcut: 'Ctrl+R', action: 'toggleRulers' },
      { label: 'Grid', action: 'toggleGrid' },
    ],
  },
  {
    label: 'Help',
    items: [
      { label: 'Keyboard Shortcuts', action: 'shortcuts' },
      { label: 'About Compositor Web', action: 'about' },
    ],
  },
];

export default function MenuBar() {
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const store = useEditorStore();

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpenMenu(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleAction = (action: string) => {
    setOpenMenu(null);
    const s = useEditorStore.getState();
    switch (action) {
      case 'new': s.newProject(); break;
      case 'open': handleOpenFile(); break;
      case 'exportPng': handleExport('png'); break;
      case 'exportJpeg': handleExport('jpeg'); break;
      case 'undo': s.undo(); break;
      case 'redo': s.redo(); break;
      case 'copy': {
        const p = s.projects.find(p => p.id === s.activeProjectId);
        if (p?.activeLayerId) s.copyLayer(p.activeLayerId);
        break;
      }
      case 'paste': s.pasteLayer(); break;
      case 'addLayer': s.addLayer('pixel'); break;
      case 'duplicate': {
        const p = s.projects.find(p => p.id === s.activeProjectId);
        if (p?.activeLayerId) s.duplicateLayer(p.activeLayerId);
        break;
      }
      case 'delete': {
        const p = s.projects.find(p => p.id === s.activeProjectId);
        if (p?.activeLayerId) s.deleteLayer(p.activeLayerId);
        break;
      }
      case 'mergeDown': s.mergeDown(); break;
      case 'addMask': {
        const p = s.projects.find(p => p.id === s.activeProjectId);
        if (p?.activeLayerId) s.addLayerMask(p.activeLayerId);
        break;
      }
      case 'selectAll': {
        const p = s.projects.find(p => p.id === s.activeProjectId);
        if (p) s.setSelection({ x: 0, y: 0, width: p.width, height: p.height, type: 'rect' });
        break;
      }
      case 'deselect': s.setSelection(null); break;
      case 'zoomIn': {
        const p = s.projects.find(p => p.id === s.activeProjectId);
        if (p) s.setZoom(Math.min(16, p.zoom * 1.25));
        break;
      }
      case 'zoomOut': {
        const p = s.projects.find(p => p.id === s.activeProjectId);
        if (p) s.setZoom(Math.max(0.05, p.zoom / 1.25));
        break;
      }
      case 'fitScreen': s.setZoom(1); break;
      case 'toggleRulers': s.toggleRulers(); break;
      case 'toggleGrid': s.toggleGrid(); break;
      case 'adjust-invert': {
        const p = s.projects.find(p => p.id === s.activeProjectId);
        if (!p || !p.activeLayerId) return;
        const layer = p.layers.find(l => l.id === p.activeLayerId);
        if (!layer?.canvas) return;
        const ctx = layer.canvas.getContext('2d')!;
        const imgData = ctx.getImageData(0, 0, layer.width, layer.height);
        import('@/engine/filters').then(({ applyAdjustment }) => {
          const result = applyAdjustment(imgData, { type: 'invert', params: {} });
          ctx.putImageData(result, 0, 0);
        });
        break;
      }
      case 'adjust-bw': {
        const p = s.projects.find(p => p.id === s.activeProjectId);
        if (!p || !p.activeLayerId) return;
        const layer = p.layers.find(l => l.id === p.activeLayerId);
        if (!layer?.canvas) return;
        const ctx = layer.canvas.getContext('2d')!;
        const imgData = ctx.getImageData(0, 0, layer.width, layer.height);
        import('@/engine/filters').then(({ applyAdjustment }) => {
          const result = applyAdjustment(imgData, { type: 'bw', params: {} });
          ctx.putImageData(result, 0, 0);
        });
        break;
      }
      case 'filter-gaussian': {
        const p = s.projects.find(p => p.id === s.activeProjectId);
        if (!p || !p.activeLayerId) return;
        const layer = p.layers.find(l => l.id === p.activeLayerId);
        if (!layer?.canvas) return;
        const ctx = layer.canvas.getContext('2d')!;
        const imgData = ctx.getImageData(0, 0, layer.width, layer.height);
        import('@/engine/filters').then(({ applyAdjustment }) => {
          const result = applyAdjustment(imgData, { type: 'gaussian-blur', params: { radius: 5 } });
          ctx.putImageData(result, 0, 0);
        });
        break;
      }
      case 'filter-noise': {
        const p = s.projects.find(p => p.id === s.activeProjectId);
        if (!p || !p.activeLayerId) return;
        const layer = p.layers.find(l => l.id === p.activeLayerId);
        if (!layer?.canvas) return;
        const ctx = layer.canvas.getContext('2d')!;
        const imgData = ctx.getImageData(0, 0, layer.width, layer.height);
        import('@/engine/filters').then(({ applyAdjustment }) => {
          const result = applyAdjustment(imgData, { type: 'noise', params: { amount: 15, monochrome: false } });
          ctx.putImageData(result, 0, 0);
        });
        break;
      }
      case 'about':
        alert('Compositor Web v0.1.0\nA web-based image editor inspired by Compositor for macOS.\nBuilt with React + TypeScript + Canvas.');
        break;
    }
  };

  const handleOpenFile = () => {
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
  };

  const handleExport = (format: 'png' | 'jpeg') => {
    const s = useEditorStore.getState();
    const p = s.projects.find(p => p.id === s.activeProjectId);
    if (!p) return;
    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = p.width;
    exportCanvas.height = p.height;
    const ctx = exportCanvas.getContext('2d')!;
    import('@/engine/renderer').then(({ renderProject }) => {
      renderProject(p, ctx, p.width, p.height);
      const link = document.createElement('a');
      link.download = `${p.name}.${format}`;
      link.href = exportCanvas.toDataURL(format === 'jpeg' ? 'image/jpeg' : 'image/png', 0.92);
      link.click();
    });
  };

  return (
    <div className="menu-bar" ref={ref}>
      {MENUS.map((menu) => (
        <div key={menu.label} style={{ position: 'relative' }}>
          <div
            className="menu-item"
            onClick={() => setOpenMenu(openMenu === menu.label ? null : menu.label)}
            style={openMenu === menu.label ? { background: '#3a3a3a' } : {}}
          >
            {menu.label}
          </div>
          {openMenu === menu.label && (
            <div className="menu-dropdown">
              {menu.items.map((item, i) =>
                item.divider ? (
                  <div key={i} className="menu-separator" />
                ) : (
                  <div key={i} className="menu-dropdown-item" onClick={() => handleAction(item.action!)}>
                    <span>{item.label}</span>
                    {item.shortcut && <span className="shortcut">{item.shortcut}</span>}
                  </div>
                )
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
