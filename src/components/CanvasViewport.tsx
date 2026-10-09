import { useRef, useEffect, useState, useCallback } from 'react';
import { useEditorStore } from '@/store/editorStore';
import { renderProject } from '@/engine/renderer';
import { floodFill, magicWandSelect } from '@/engine/filters';
import { hexToRgb } from '@/engine/colorUtils';
import type { LayerData } from '@/types';

export default function CanvasViewport() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDrawing = useRef(false);
  const lastPos = useRef<{ x: number; y: number } | null>(null);
  const startPos = useRef<{ x: number; y: number } | null>(null);
  const shapePreview = useRef<{ x: number; y: number; w: number; h: number } | null>(null);
  const cloneSource = useRef<{ x: number; y: number } | null>(null);
  const lassoPoints = useRef<{ x: number; y: number }[]>([]);
  const gradientStart = useRef<{ x: number; y: number } | null>(null);
  const [, forceUpdate] = useState(0);

  const store = useEditorStore();
  const activeProject = store.projects.find(p => p.id === store.activeProjectId);

  // Render loop
  useEffect(() => {
    const canvas = canvasRef.current;
    const overlay = overlayRef.current;
    if (!canvas || !overlay || !activeProject) return;

    const ctx = canvas.getContext('2d')!;
    const octx = overlay.getContext('2d')!;

    canvas.width = activeProject.width;
    canvas.height = activeProject.height;
    overlay.width = activeProject.width;
    overlay.height = activeProject.height;

    renderProject(activeProject, ctx, activeProject.width, activeProject.height);
    octx.clearRect(0, 0, overlay.width, overlay.height);

    // Grid
    if (store.showGrid) {
      octx.strokeStyle = 'rgba(100,150,255,0.25)';
      octx.lineWidth = 1;
      const gs = store.gridSize;
      for (let x = 0; x <= activeProject.width; x += gs) {
        octx.beginPath(); octx.moveTo(x, 0); octx.lineTo(x, activeProject.height); octx.stroke();
      }
      for (let y = 0; y <= activeProject.height; y += gs) {
        octx.beginPath(); octx.moveTo(0, y); octx.lineTo(activeProject.width, y); octx.stroke();
      }
    }

    // Guides
    for (const g of activeProject.guides) {
      octx.strokeStyle = '#3a8ee6';
      octx.lineWidth = 1;
      octx.beginPath();
      if (g.orientation === 'vertical') { octx.moveTo(g.position, 0); octx.lineTo(g.position, activeProject.height); }
      else { octx.moveTo(0, g.position); octx.lineTo(activeProject.width, g.position); }
      octx.stroke();
    }

    // Selection marching ants
    if (store.selection) {
      const sel = store.selection;
      octx.save();
      octx.strokeStyle = '#000'; octx.lineWidth = 1; octx.setLineDash([4, 4]);
      octx.strokeRect(sel.x, sel.y, sel.width, sel.height);
      octx.strokeStyle = '#fff'; octx.lineDashOffset = 4;
      octx.strokeRect(sel.x, sel.y, sel.width, sel.height);
      octx.restore();
    }

    // Lasso preview
    if (lassoPoints.current.length > 1 && isDrawing.current) {
      octx.strokeStyle = '#3a8ee6'; octx.lineWidth = 1; octx.setLineDash([4, 4]);
      octx.beginPath();
      octx.moveTo(lassoPoints.current[0].x, lassoPoints.current[0].y);
      for (const pt of lassoPoints.current) octx.lineTo(pt.x, pt.y);
      octx.stroke();
      octx.setLineDash([]);
    }

    // Gradient preview line
    if (gradientStart.current && isDrawing.current && lastPos.current) {
      octx.strokeStyle = '#fff'; octx.lineWidth = 1; octx.setLineDash([4, 4]);
      octx.beginPath();
      octx.moveTo(gradientStart.current.x, gradientStart.current.y);
      octx.lineTo(lastPos.current.x, lastPos.current.y);
      octx.stroke();
      octx.setLineDash([]);
    }

    // Shape / marquee preview
    if (shapePreview.current && isDrawing.current) {
      const s = shapePreview.current;
      octx.strokeStyle = '#3a8ee6'; octx.lineWidth = 1; octx.setLineDash([4, 4]);
      octx.strokeRect(s.x, s.y, s.w, s.h);
      octx.setLineDash([]);
    }

    // Crop overlay
    if (store.crop?.active) {
      const c = store.crop;
      octx.fillStyle = 'rgba(0,0,0,0.5)';
      octx.fillRect(0, 0, activeProject.width, c.y);
      octx.fillRect(0, c.y + c.height, activeProject.width, activeProject.height - c.y - c.height);
      octx.fillRect(0, c.y, c.x, c.height);
      octx.fillRect(c.x + c.width, c.y, activeProject.width - c.x - c.width, c.height);
      octx.strokeStyle = '#3a8ee6'; octx.lineWidth = 1;
      octx.strokeRect(c.x, c.y, c.width, c.height);
      // Rule of thirds
      octx.strokeStyle = 'rgba(255,255,255,0.4)';
      for (let i = 1; i < 3; i++) {
        octx.beginPath(); octx.moveTo(c.x + (c.width * i) / 3, c.y); octx.lineTo(c.x + (c.width * i) / 3, c.y + c.height); octx.stroke();
        octx.beginPath(); octx.moveTo(c.x, c.y + (c.height * i) / 3); octx.lineTo(c.x + c.width, c.y + (c.height * i) / 3); octx.stroke();
      }
    }

    // Transform handles (active layer bounding box)
    if (!store.crop?.active) {
      const layer = activeProject.layers.find(l => l.id === activeProject.activeLayerId);
      if (layer && (store.tool.id === 'move' || store.transform?.active)) {
        const handles = getHandles(layer);
        octx.save();
        octx.translate(layer.x + layer.width / 2, layer.y + layer.height / 2);
        octx.rotate(((layer.rotation || 0) * Math.PI) / 180);
        octx.translate(-layer.width / 2, -layer.height / 2);
        octx.strokeStyle = '#3a8ee6'; octx.lineWidth = 1;
        octx.strokeRect(0, 0, layer.width, layer.height);
        octx.fillStyle = '#fff';
        for (const h of handles) {
          octx.fillRect(h.x - 4, h.y - 4, 8, 8);
          octx.strokeRect(h.x - 4, h.y - 4, 8, 8);
        }
        // Rotate handle
        octx.beginPath(); octx.arc(layer.width / 2, -18, 5, 0, Math.PI * 2); octx.fill(); octx.stroke();
        octx.beginPath(); octx.moveTo(layer.width / 2, 0); octx.lineTo(layer.width / 2, -13); octx.stroke();
        octx.restore();
      }
    }
  });

  function getHandles(layer: LayerData) {
    const w = layer.width, h = layer.height;
    return [
      { id: 'nw', x: 0, y: 0 }, { id: 'n', x: w / 2, y: 0 }, { id: 'ne', x: w, y: 0 },
      { id: 'e', x: w, y: h / 2 }, { id: 'se', x: w, y: h }, { id: 's', x: w / 2, y: h },
      { id: 'sw', x: 0, y: h }, { id: 'w', x: 0, y: h / 2 },
    ];
  }

  useEffect(() => { forceUpdate(n => n + 1); }, [store.projects, store.selection, store.tool, store.transform, store.crop, store.showGrid, store.showNavigator]);

  const getCanvasPos = useCallback((e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas || !activeProject) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: Math.round((e.clientX - rect.left) * (canvas.width / rect.width)),
      y: Math.round((e.clientY - rect.top) * (canvas.height / rect.height)),
    };
  }, [activeProject]);

  const getActiveLayer = useCallback((): LayerData | null => {
    if (!activeProject || !activeProject.activeLayerId) return null;
    return activeProject.layers.find(l => l.id === activeProject.activeLayerId) || null;
  }, [activeProject]);

  const drawBrushStroke = useCallback((from: { x: number; y: number }, to: { x: number; y: number }) => {
    const layer = getActiveLayer();
    if (!layer?.canvas) return;
    const ctx = layer.canvas.getContext('2d')!;
    const tool = store.tool;
    ctx.save();
    ctx.globalAlpha = (tool.brushOpacity / 100) * (tool.brushFlow / 100);
    if (tool.id === 'eraser') { ctx.globalCompositeOperation = 'destination-out'; ctx.strokeStyle = 'rgba(0,0,0,1)'; }
    else ctx.strokeStyle = tool.brushColor;
    ctx.lineWidth = tool.brushSize; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    if (store.selection) { ctx.save(); ctx.beginPath(); ctx.rect(store.selection.x, store.selection.y, store.selection.width, store.selection.height); ctx.clip(); }
    ctx.beginPath(); ctx.moveTo(from.x, from.y); ctx.lineTo(to.x, to.y); ctx.stroke();
    if (store.selection) ctx.restore();
    ctx.restore();
  }, [getActiveLayer, store.tool, store.selection]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    const pos = getCanvasPos(e);
    const tool = store.tool;
    const layer = getActiveLayer();

    if (tool.id === 'hand' || e.button === 1 || (e.button === 0 && e.altKey && tool.id !== 'clone')) {
      isDrawing.current = true; lastPos.current = { x: e.clientX, y: e.clientY }; return;
    }
    if (tool.id === 'zoom') {
      store.setZoom(e.altKey ? Math.max(0.05, activeProject!.zoom / 1.25) : Math.min(16, activeProject!.zoom * 1.25));
      return;
    }
    if (tool.id === 'eyedropper' && layer?.canvas) {
      const ctx = layer.canvas.getContext('2d')!;
      const p = ctx.getImageData(Math.max(0, pos.x), Math.max(0, pos.y), 1, 1).data;
      store.setTool({ brushColor: `#${[p[0], p[1], p[2]].map(v => v.toString(16).padStart(2, '0')).join('')}` });
      return;
    }
    if (tool.id === 'fill' && layer?.canvas) {
      const ctx = layer.canvas.getContext('2d')!;
      const c = hexToRgb(tool.brushColor);
      store.pushHistory('Fill');
      floodFill(ctx, pos.x, pos.y, { r: c.r, g: c.g, b: c.b, a: 255 }, 32);
      forceUpdate(n => n + 1); return;
    }
    if (tool.id === 'magic' && layer?.canvas) {
      // Sample from merged visible canvas
      const merged = document.createElement('canvas');
      merged.width = activeProject!.width; merged.height = activeProject!.height;
      renderProject(activeProject!, merged.getContext('2d')!, activeProject!.width, activeProject!.height);
      const result = magicWandSelect(merged.getContext('2d')!, pos.x, pos.y, 32, !e.shiftKey);
      if (result) store.setSelection({ x: result.x, y: result.y, width: result.width, height: result.height, type: 'magic', mask: result.mask });
      return;
    }
    if (tool.id === 'clone') {
      if (e.altKey || !cloneSource.current) { cloneSource.current = pos; return; }
    }
    if (tool.id === 'gradient' && layer) {
      isDrawing.current = true; gradientStart.current = pos; lastPos.current = pos; return;
    }
    if (tool.id === 'lasso') {
      isDrawing.current = true; lassoPoints.current = [pos]; lastPos.current = pos; return;
    }
    if (tool.id === 'move' && layer) {
      // Check if clicking a transform handle
      if (store.transform?.active) {
        store.updateTransform('move', pos.x - store.transform.origX - (store.transform.origW / 2), pos.y - store.transform.origY - (store.transform.origH / 2));
      }
      isDrawing.current = true; lastPos.current = pos; store.pushHistory('Move'); return;
    }
    if ((tool.id === 'marquee' || tool.id === 'shape' || tool.id === 'crop') && layer) {
      isDrawing.current = true; startPos.current = pos;
      shapePreview.current = { x: pos.x, y: pos.y, w: 0, h: 0 };
      if (tool.id === 'crop') { store.beginCrop(); }
      return;
    }
    if ((tool.id === 'brush' || tool.id === 'eraser' || tool.id === 'blur' || tool.id === 'clone') && layer?.canvas) {
      isDrawing.current = true; lastPos.current = pos;
      if (tool.id !== 'clone' || cloneSource.current) store.pushHistory(tool.id === 'eraser' ? 'Erase' : 'Paint');
      drawBrushStroke(pos, pos); forceUpdate(n => n + 1); return;
    }
    if (tool.id === 'text') {
      store.addLayer('text');
      const s = useEditorStore.getState();
      const p = s.projects.find(p => p.id === s.activeProjectId);
      const nl = p?.layers.find(l => l.id === p?.activeLayerId);
      if (nl) { nl.x = pos.x; nl.y = pos.y; nl.text = 'Text'; nl.fontSize = tool.fontSize; nl.fontFamily = tool.fontFamily; nl.textColor = tool.brushColor; nl.textAlign = tool.textAlign; }
      forceUpdate(n => n + 1); return;
    }
  }, [getCanvasPos, getActiveLayer, store, activeProject, drawBrushStroke]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const pos = getCanvasPos(e);
    const tool = store.tool;

    if (tool.id === 'hand' || (isDrawing.current && (e.buttons === 4 || (e.altKey && e.buttons === 1 && tool.id !== 'clone')))) {
      if (lastPos.current) {
        store.setPan(activeProject!.panX + (e.clientX - lastPos.current.x), activeProject!.panY + (e.clientY - lastPos.current.y));
        lastPos.current = { x: e.clientX, y: e.clientY };
      }
      return;
    }
    if (!isDrawing.current) return;

    if (tool.id === 'move') {
      const layer = getActiveLayer();
      if (layer && lastPos.current) {
        layer.x += pos.x - lastPos.current.x; layer.y += pos.y - lastPos.current.y;
        lastPos.current = pos; forceUpdate(n => n + 1);
      }
      return;
    }
    if (tool.id === 'lasso') {
      lassoPoints.current.push(pos); lastPos.current = pos; forceUpdate(n => n + 1); return;
    }
    if (tool.id === 'gradient') { lastPos.current = pos; forceUpdate(n => n + 1); return; }
    if ((tool.id === 'marquee' || tool.id === 'shape' || tool.id === 'crop') && startPos.current) {
      let w = Math.abs(pos.x - startPos.current.x), h = Math.abs(pos.y - startPos.current.y);
      let x = Math.min(startPos.current.x, pos.x), y = Math.min(startPos.current.y, pos.y);
      if (tool.id === 'crop' && store.crop) {
        const ratio = store.crop.ratio;
        if (ratio && ratio !== 'free') {
          const [rw, rh] = ratio.split(':').map(Number);
          if (w / h > rw / rh) w = h * rw / rh; else h = w * rh / rw;
          if (pos.x < startPos.current.x) x = startPos.current.x - w;
          if (pos.y < startPos.current.y) y = startPos.current.y - h;
        }
        store.crop.x = Math.round(x); store.crop.y = Math.round(y);
        store.crop.width = Math.max(10, Math.round(w)); store.crop.height = Math.max(10, Math.round(h));
      } else {
        shapePreview.current = { x, y, w, h };
      }
      forceUpdate(n => n + 1); return;
    }
    if ((tool.id === 'brush' || tool.id === 'eraser' || tool.id === 'blur' || tool.id === 'clone') && lastPos.current) {
      if (tool.id === 'clone' && cloneSource.current) {
        const layer = getActiveLayer();
        if (layer?.canvas) {
          const ctx = layer.canvas.getContext('2d')!;
          cloneSource.current.x += pos.x - lastPos.current.x;
          cloneSource.current.y += pos.y - lastPos.current.y;
          const merged = document.createElement('canvas');
          merged.width = layer.width; merged.height = layer.height;
          renderProject(activeProject!, merged.getContext('2d')!, layer.width, layer.height);
          ctx.save(); ctx.globalAlpha = store.tool.brushOpacity / 100;
          ctx.beginPath(); ctx.arc(pos.x, pos.y, store.tool.brushSize / 2, 0, Math.PI * 2); ctx.clip();
          ctx.drawImage(merged, cloneSource.current.x - pos.x, cloneSource.current.y - pos.y);
          ctx.restore();
        }
      } else {
        drawBrushStroke(lastPos.current, pos);
      }
      lastPos.current = pos; forceUpdate(n => n + 1);
    }
  }, [getCanvasPos, getActiveLayer, store, activeProject, drawBrushStroke]);

  const handleMouseUp = useCallback(() => {
    const tool = store.tool;

    if (tool.id === 'lasso' && lassoPoints.current.length > 2) {
      const pts = lassoPoints.current;
      const xs = pts.map(p => p.x), ys = pts.map(p => p.y);
      store.setSelection({
        x: Math.min(...xs), y: Math.min(...ys),
        width: Math.max(...xs) - Math.min(...xs),
        height: Math.max(...ys) - Math.min(...ys),
        type: 'freehand', points: pts,
      });
    }

    if (tool.id === 'gradient' && gradientStart.current && lastPos.current) {
      const s = gradientStart.current, e = lastPos.current;
      const layer = getActiveLayer();
      if (layer?.canvas) {
        store.pushHistory('Gradient');
        const ctx = layer.canvas.getContext('2d')!;
        const dx = e.x - s.x, dy = e.y - s.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const angle = Math.atan2(dy, dx) * 180 / Math.PI;
        if (dist > 2) {
          const g = store.tool.gradientType === 'radial'
            ? ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, dist)
            : ctx.createLinearGradient(s.x, s.y, e.x, e.y);
          g.addColorStop(0, store.tool.brushColor);
          g.addColorStop(1, 'rgba(255,255,255,0)');
          ctx.save();
          ctx.globalAlpha = store.tool.brushOpacity / 100;
          ctx.fillStyle = g;
          ctx.fillRect(0, 0, layer.width, layer.height);
          ctx.restore();
        }
      }
    }

    if (tool.id === 'marquee' && shapePreview.current) {
      const s = shapePreview.current;
      if (s.w > 2 && s.h > 2) store.setSelection({ x: s.x, y: s.y, width: s.w, height: s.h, type: 'rect' });
    }
    if (tool.id === 'shape' && shapePreview.current) {
      const s = shapePreview.current;
      if (s.w > 2 && s.h > 2) {
        store.addLayer('shape');
        const st = useEditorStore.getState();
        const p = st.projects.find(p => p.id === st.activeProjectId);
        const nl = p?.layers.find(l => l.id === p?.activeLayerId);
        if (nl) { nl.x = s.x; nl.y = s.y; nl.width = s.w; nl.height = s.h; nl.shapeType = tool.shapeType; nl.shapeFill = tool.shapeFill; nl.shapeStroke = tool.shapeStroke; nl.shapeStrokeWidth = tool.shapeStrokeWidth; }
      }
    }

    isDrawing.current = false;
    lastPos.current = null; startPos.current = null;
    shapePreview.current = null; lassoPoints.current = []; gradientStart.current = null;
    forceUpdate(n => n + 1);
  }, [store, getActiveLayer]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    if (e.ctrlKey || e.metaKey) {
      store.setZoom(Math.max(0.05, Math.min(16, activeProject!.zoom * (e.deltaY > 0 ? 0.9 : 1.1))));
    } else {
      store.setPan(activeProject!.panX - e.deltaX, activeProject!.panY - e.deltaY);
    }
  }, [store, activeProject]);

  // Double-click on ruler area to add guide - handled via container
  const handleContainerDoubleClick = useCallback((e: React.MouseEvent) => {
    if (!activeProject || !store.showRulers) return;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    // Ruler area: top 20px or left 20px of the canvas wrapper area
    // For simplicity: if near top edge add horizontal guide, near left add vertical
  }, [activeProject, store.showRulers]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;
      const s = useEditorStore.getState();
      const key = e.key.toLowerCase();
      const ctrl = e.ctrlKey || e.metaKey;

      if (ctrl && key === 'f') { e.preventDefault(); s.setCommandPaletteOpen(true); return; }
      if (ctrl && key === 't') { e.preventDefault(); s.beginTransform(); return; }
      if (ctrl && key === 'z') { e.preventDefault(); e.shiftKey ? s.redo() : s.undo(); return; }
      if (ctrl && key === 'a') {
        e.preventDefault();
        const p = s.projects.find((p: any) => p.id === s.activeProjectId);
        if (p) s.setSelection({ x: 0, y: 0, width: p.width, height: p.height, type: 'rect' });
        return;
      }
      if (ctrl && key === 'd') { e.preventDefault(); s.setSelection(null); return; }
      if (ctrl && key === 'j') {
        e.preventDefault();
        const p = s.projects.find((p: any) => p.id === s.activeProjectId);
        if (p?.activeLayerId) s.duplicateLayer(p.activeLayerId);
        return;
      }
      if (key === 'f' && !ctrl) { s.toggleFullscreen(); return; }
      if (key === 'enter' || key === 'return') {
        if (s.transform?.active) s.applyTransform();
        if (s.crop?.active) s.applyCrop();
        return;
      }
      if (key === 'escape') {
        if (s.transform?.active) s.cancelTransform();
        if (s.crop?.active) s.cancelCrop();
        s.setCommandPaletteOpen(false);
        s.setDialog(null);
        return;
      }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        const p = s.projects.find((p: any) => p.id === s.activeProjectId);
        if (p?.activeLayerId) s.deleteLayer(p.activeLayerId);
        return;
      }
      if (!ctrl && !e.altKey && key.length === 1) {
        const map: Record<string, any> = { v: 'move', m: 'marquee', l: 'lasso', w: 'magic', b: 'brush', e: 'eraser', g: 'fill', i: 'eyedropper', u: 'shape', t: 'text', s: 'clone', r: 'blur', h: 'hand', z: 'zoom', c: 'crop' };
        if (map[key]) { e.preventDefault(); s.setToolId(map[key]); }
      }
      if (key === '[') s.setTool({ brushSize: Math.max(1, s.tool.brushSize - 2) });
      if (key === ']') s.setTool({ brushSize: Math.min(500, s.tool.brushSize + 2) });
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  if (!activeProject) {
    return <div className="canvas-area"><div style={{ color: '#666', fontSize: 14 }}>No project open.</div></div>;
  }

  const displayWidth = activeProject.width * activeProject.zoom;
  const displayHeight = activeProject.height * activeProject.zoom;
  const cursorClass =
    store.tool.id === 'move' ? 'tool-move' :
    store.tool.id === 'hand' ? 'tool-hand' :
    store.tool.id === 'zoom' ? 'tool-zoom' :
    store.tool.id === 'eyedropper' ? 'tool-eyedropper' : '';

  return (
    <div className="canvas-area" ref={containerRef} onDoubleClick={handleContainerDoubleClick}>
      <div className="canvas-wrapper" style={{ transform: `translate(${activeProject.panX}px, ${activeProject.panY}px)` }}>
        <canvas
          ref={canvasRef}
          style={{ width: displayWidth, height: displayHeight }}
          className={cursorClass}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onWheel={handleWheel}
        />
        <canvas ref={overlayRef} style={{ position: 'absolute', top: 0, left: 0, width: displayWidth, height: displayHeight, pointerEvents: 'none' }} />
        {/* Crop confirm buttons */}
        {store.crop?.active && (
          <div style={{ position: 'absolute', top: -32, left: 0, display: 'flex', gap: 6 }}>
            <select
              value={store.crop.ratio || 'free'}
              onChange={(e) => store.setCropRatio(e.target.value === 'free' ? null : e.target.value)}
              style={{ background: '#2a2a2a', border: '1px solid #444', color: '#fff', borderRadius: 3, fontSize: 11, padding: '2px 4px' }}
            >
              <option value="free">Free</option>
              <option value="1:1">1:1</option>
              <option value="3:4">3:4</option>
              <option value="4:3">4:3</option>
              <option value="9:16">9:16</option>
              <option value="16:9">16:9</option>
            </select>
            <button className="btn btn-primary" style={{ padding: '2px 10px', fontSize: 11 }} onClick={() => store.applyCrop()}>Apply</button>
            <button className="btn" style={{ padding: '2px 10px', fontSize: 11 }} onClick={() => store.cancelCrop()}>Cancel</button>
          </div>
        )}
      </div>
    </div>
  );
}
