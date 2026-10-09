import { useRef, useEffect, useState, useCallback } from 'react';
import { useEditorStore } from '@/store/editorStore';
import { useT } from '@/i18n';
import { renderProject } from '@/engine/renderer';
import { floodFill, magicWandSelect, applyAdjustment } from '@/engine/filters';
import { hexToRgb } from '@/engine/colorUtils';
import { exportProject, openImageFile } from '@/utils/fileIO';
import type { LayerData, AdjustmentSettings } from '@/types';

// Apply an adjustment to the active layer's pixels (used by Ctrl+I / Ctrl+Shift+U).
function applyActiveAdjustment(type: AdjustmentSettings['type'], params: Record<string, any>, description: string): void {
  const s = useEditorStore.getState();
  const p = s.projects.find((pr) => pr.id === s.activeProjectId);
  if (!p || !p.activeLayerId) return;
  const layer = p.layers.find((l) => l.id === p.activeLayerId);
  if (!layer?.canvas) return;
  const ctx = layer.canvas.getContext('2d');
  if (!ctx) return;
  s.pushHistory(description);
  const imgData = ctx.getImageData(0, 0, layer.width, layer.height);
  ctx.putImageData(applyAdjustment(imgData, { type, params }), 0, 0);
}

// Choose a ruler tick spacing so ticks are at least ~50 screen px apart.
function pickRulerStep(zoom: number): number {
  const steps = [1, 2, 5, 10, 20, 25, 50, 100, 200, 250, 500, 1000, 2000, 5000];
  for (const s of steps) {
    if (s * zoom >= 50) return s;
  }
  return 10000;
}

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
  const cursorPos = useRef<{ x: number; y: number } | null>(null);
  const lastStrokeEnd = useRef<{ x: number; y: number } | null>(null);
  const spaceDown = useRef(false);
  const rulerHRef = useRef<HTMLCanvasElement>(null);
  const rulerVRef = useRef<HTMLCanvasElement>(null);
  const guideDrag = useRef<{ orientation: 'horizontal' | 'vertical'; pos: number | null } | null>(null);
  const [, forceUpdate] = useState(0);
  const t = useT();

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
    if (store.showGuides) {
      for (const g of activeProject.guides) {
        octx.strokeStyle = '#3a8ee6';
        octx.lineWidth = 1;
        octx.beginPath();
        if (g.orientation === 'vertical') { octx.moveTo(g.position, 0); octx.lineTo(g.position, activeProject.height); }
        else { octx.moveTo(0, g.position); octx.lineTo(activeProject.width, g.position); }
        octx.stroke();
      }
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

    // Brush outline cursor
    if (cursorPos.current && ['brush', 'eraser', 'blur', 'clone'].includes(store.tool.id)) {
      const r = Math.max(1, store.tool.brushSize / 2);
      const lw = 1 / (activeProject.zoom || 1);
      octx.save();
      octx.beginPath();
      octx.arc(cursorPos.current.x, cursorPos.current.y, r, 0, Math.PI * 2);
      octx.strokeStyle = 'rgba(0,0,0,0.75)';
      octx.lineWidth = lw * 2;
      octx.stroke();
      octx.strokeStyle = 'rgba(255,255,255,0.95)';
      octx.lineWidth = lw;
      octx.stroke();
      octx.restore();
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

    // Guide being dragged out of a ruler
    const gd = guideDrag.current;
    if (gd && gd.pos !== null) {
      octx.save();
      octx.strokeStyle = '#3a8ee6';
      octx.lineWidth = 1 / (activeProject.zoom || 1);
      octx.beginPath();
      if (gd.orientation === 'horizontal') { octx.moveTo(0, gd.pos); octx.lineTo(activeProject.width, gd.pos); }
      else { octx.moveTo(gd.pos, 0); octx.lineTo(gd.pos, activeProject.height); }
      octx.stroke();
      octx.restore();
    }

    // Rulers (screen-space, drawn on the canvas-area overlay)
    drawRulers();
  });

  function getHandles(layer: LayerData) {
    const w = layer.width, h = layer.height;
    return [
      { id: 'nw', x: 0, y: 0 }, { id: 'n', x: w / 2, y: 0 }, { id: 'ne', x: w, y: 0 },
      { id: 'e', x: w, y: h / 2 }, { id: 'se', x: w, y: h }, { id: 's', x: w / 2, y: h },
      { id: 'sw', x: 0, y: h }, { id: 'w', x: 0, y: h / 2 },
    ];
  }

  // Draw the top and left rulers in screen space (they follow zoom + pan).
  function drawRulers() {
    if (!store.showRulers || !activeProject) return;
    const container = containerRef.current;
    const rcH = rulerHRef.current;
    const rcV = rulerVRef.current;
    if (!container || !rcH || !rcV) return;
    const cw = container.clientWidth;
    const ch = container.clientHeight;
    const R = 20;
    const zoom = activeProject.zoom || 1;
    const originX = (cw - activeProject.width * zoom) / 2 + activeProject.panX;
    const originY = (ch - activeProject.height * zoom) / 2 + activeProject.panY;
    const step = pickRulerStep(zoom);

    // Horizontal ruler
    if (rcH.width !== cw) rcH.width = cw;
    if (rcH.height !== R) rcH.height = R;
    const h = rcH.getContext('2d');
    if (h) {
      h.clearRect(0, 0, cw, R);
      h.fillStyle = '#252525';
      h.fillRect(0, 0, cw, R);
      h.strokeStyle = '#4a4a4a';
      h.fillStyle = '#909090';
      h.font = '9px sans-serif';
      h.textBaseline = 'top';
      h.beginPath();
      const hStart = Math.floor(((0 - originX) / zoom) / step) * step;
      const hEnd = Math.ceil(((cw - originX) / zoom) / step) * step;
      for (let d = hStart; d <= hEnd; d += step) {
        const x = Math.round(originX + d * zoom) + 0.5;
        if (x < 0 || x > cw) continue;
        h.moveTo(x, R);
        h.lineTo(x, R - 7);
        h.fillText(String(d), x + 2, 1);
      }
      h.stroke();
      h.strokeStyle = '#3a3a3a';
      h.beginPath(); h.moveTo(0, R - 0.5); h.lineTo(cw, R - 0.5); h.stroke();
    }

    // Vertical ruler
    if (rcV.height !== ch) rcV.height = ch;
    if (rcV.width !== R) rcV.width = R;
    const v = rcV.getContext('2d');
    if (v) {
      v.clearRect(0, 0, R, ch);
      v.fillStyle = '#252525';
      v.fillRect(0, 0, R, ch);
      v.strokeStyle = '#4a4a4a';
      v.fillStyle = '#909090';
      v.font = '9px sans-serif';
      v.beginPath();
      const vStart = Math.floor(((0 - originY) / zoom) / step) * step;
      const vEnd = Math.ceil(((ch - originY) / zoom) / step) * step;
      for (let d = vStart; d <= vEnd; d += step) {
        const y = Math.round(originY + d * zoom) + 0.5;
        if (y < 0 || y > ch) continue;
        v.moveTo(R, y);
        v.lineTo(R - 7, y);
        v.save();
        v.translate(R - 2, y - 2);
        v.rotate(-Math.PI / 2);
        v.textAlign = 'left';
        v.textBaseline = 'bottom';
        v.fillText(String(d), 0, 0);
        v.restore();
      }
      v.stroke();
      v.strokeStyle = '#3a3a3a';
      v.beginPath(); v.moveTo(R - 0.5, 0); v.lineTo(R - 0.5, ch); v.stroke();
    }
  }

  // Drag out of a ruler to create a guide.
  const startGuideDrag = (orientation: 'horizontal' | 'vertical') => (e: React.MouseEvent) => {
    e.preventDefault();
    const container = containerRef.current;
    if (!container || !activeProject) return;
    const rect = container.getBoundingClientRect();
    const zoom = activeProject.zoom || 1;
    const computePos = (clientX: number, clientY: number): number => {
      if (orientation === 'horizontal') {
        const originY = (container.clientHeight - activeProject.height * zoom) / 2 + activeProject.panY;
        return Math.round((clientY - rect.top - originY) / zoom);
      }
      const originX = (container.clientWidth - activeProject.width * zoom) / 2 + activeProject.panX;
      return Math.round((clientX - rect.left - originX) / zoom);
    };
    guideDrag.current = { orientation, pos: computePos(e.clientX, e.clientY) };
    forceUpdate(n => n + 1);
    const onMove = (ev: MouseEvent) => {
      if (!guideDrag.current) return;
      guideDrag.current.pos = computePos(ev.clientX, ev.clientY);
      forceUpdate(n => n + 1);
    };
    const onUp = () => {
      const g = guideDrag.current;
      if (g && g.pos !== null) {
        const limit = orientation === 'horizontal' ? activeProject.height : activeProject.width;
        if (g.pos >= 0 && g.pos <= limit) useEditorStore.getState().addGuide(orientation, g.pos);
      }
      guideDrag.current = null;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      forceUpdate(n => n + 1);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  // Re-render on viewport resize so the rulers stay correct.
  useEffect(() => {
    const onResize = () => forceUpdate(n => n + 1);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => { forceUpdate(n => n + 1); }, [store.projects, store.selection, store.tool, store.transform, store.crop, store.showGrid, store.showNavigator, store.showRulers, store.showGuides, activeProject?.zoom, activeProject?.panX, activeProject?.panY]);

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

    if (tool.id === 'hand' || spaceDown.current || e.button === 1 || (e.button === 0 && e.altKey && tool.id !== 'clone')) {
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
      isDrawing.current = true; lastPos.current = pos; store.pushHistory('Move'); return;
    }
    if ((tool.id === 'marquee' || tool.id === 'shape' || tool.id === 'crop') && layer) {
      isDrawing.current = true; startPos.current = pos;
      shapePreview.current = { x: pos.x, y: pos.y, w: 0, h: 0 };
      if (tool.id === 'crop') { store.beginCrop(); }
      return;
    }
    if ((tool.id === 'brush' || tool.id === 'eraser' || tool.id === 'blur' || tool.id === 'clone') && layer?.canvas) {
      // Shift+click draws a straight line from the end of the last stroke.
      if (e.shiftKey && lastStrokeEnd.current && (tool.id === 'brush' || tool.id === 'eraser')) {
        store.pushHistory(tool.id === 'eraser' ? 'Erase' : 'Paint');
        drawBrushStroke(lastStrokeEnd.current, pos);
        lastStrokeEnd.current = pos;
        forceUpdate(n => n + 1);
        return;
      }
      isDrawing.current = true; lastPos.current = pos;
      if (tool.id !== 'clone' || cloneSource.current) store.pushHistory(tool.id === 'eraser' ? 'Erase' : 'Paint');
      drawBrushStroke(pos, pos);
      lastStrokeEnd.current = pos;
      forceUpdate(n => n + 1); return;
    }
    if (tool.id === 'text') {
      // Clicking inside an existing text layer selects it for editing
      // instead of stacking a new one on top.
      const p0 = activeProject!;
      const hit = [...p0.layers].reverse().find(l =>
        l.type === 'text' && l.visible &&
        pos.x >= l.x && pos.x <= l.x + l.width &&
        pos.y >= l.y && pos.y <= l.y + l.height
      );
      if (hit) {
        store.selectLayer(hit.id);
        forceUpdate(n => n + 1);
        return;
      }
      store.addLayer('text');
      const s = useEditorStore.getState();
      const p = s.projects.find(p => p.id === s.activeProjectId);
      const newId = p?.activeLayerId;
      if (newId) {
        s.updateTextLayer(newId, {
          x: pos.x, y: pos.y, text: 'Text',
          fontSize: tool.fontSize, fontFamily: tool.fontFamily,
          textColor: tool.brushColor, textAlign: tool.textAlign,
        });
      }
      forceUpdate(n => n + 1); return;
    }
  }, [getCanvasPos, getActiveLayer, store, activeProject, drawBrushStroke]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const pos = getCanvasPos(e);
    const tool = store.tool;

    // Track the brush outline cursor even when not actively drawing.
    if (['brush', 'eraser', 'blur', 'clone'].includes(tool.id)) {
      cursorPos.current = pos;
      forceUpdate(n => n + 1);
    } else if (cursorPos.current) {
      cursorPos.current = null;
      forceUpdate(n => n + 1);
    }

    if (tool.id === 'hand' || spaceDown.current || (isDrawing.current && (e.buttons === 4 || (e.altKey && e.buttons === 1 && tool.id !== 'clone')))) {
      if (lastPos.current) {
        // Read fresh state so multiple moves in one frame accumulate correctly.
        const st = useEditorStore.getState();
        const p = st.projects.find(pr => pr.id === st.activeProjectId);
        if (p) st.setPan(p.panX + (e.clientX - lastPos.current.x), p.panY + (e.clientY - lastPos.current.y));
        lastPos.current = { x: e.clientX, y: e.clientY };
      }
      return;
    }
    if (!isDrawing.current) return;

    if (tool.id === 'move') {
      const st = useEditorStore.getState();
      const p = st.projects.find(pr => pr.id === st.activeProjectId);
      const layer = p?.layers.find(l => l.id === p.activeLayerId);
      if (layer && lastPos.current) {
        st.updateLayer(layer.id, {
          x: layer.x + (pos.x - lastPos.current.x),
          y: layer.y + (pos.y - lastPos.current.y),
        });
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
        store.updateCrop({ x: Math.round(x), y: Math.round(y), width: Math.max(10, Math.round(w)), height: Math.max(10, Math.round(h)) });
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
      lastStrokeEnd.current = pos;
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
        const newId = p?.activeLayerId;
        if (newId) {
          st.updateLayer(newId, {
            x: s.x, y: s.y, width: s.w, height: s.h,
            shapeType: tool.shapeType, shapeFill: tool.shapeFill,
            shapeStroke: tool.shapeStroke, shapeStrokeWidth: tool.shapeStrokeWidth,
          });
        }
      }
    }

    isDrawing.current = false;
    lastPos.current = null; startPos.current = null;
    shapePreview.current = null; lassoPoints.current = []; gradientStart.current = null;
    forceUpdate(n => n + 1);
  }, [store, getActiveLayer]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    if (e.ctrlKey || e.metaKey || e.altKey) {
      store.setZoom(Math.max(0.05, Math.min(16, activeProject!.zoom * (e.deltaY > 0 ? 0.9 : 1.1))));
    } else {
      store.setPan(activeProject!.panX - e.deltaX, activeProject!.panY - e.deltaY);
    }
  }, [store, activeProject]);

  // Keyboard shortcuts (Photoshop-style)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;
      const s = useEditorStore.getState();
      const key = e.key.toLowerCase();
      const ctrl = e.ctrlKey || e.metaKey;
      const p = s.projects.find((pr: any) => pr.id === s.activeProjectId);
      const activeId = p?.activeLayerId ?? null;

      // ---- Always available ----
      if (key === 'escape') {
        if (s.transform?.active) s.cancelTransform();
        if (s.crop?.active) s.cancelCrop();
        s.setCommandPaletteOpen(false);
        s.setDialog(null);
        return;
      }
      if (key === 'enter' || key === 'return') {
        if (s.transform?.active) s.applyTransform();
        if (s.crop?.active) s.applyCrop();
        return;
      }
      if (key === ' ') { e.preventDefault(); spaceDown.current = true; return; }

      // ---- File ----
      if (ctrl && !e.shiftKey && !e.altKey && key === 'n') { e.preventDefault(); s.setDialog('new'); return; }
      if (ctrl && key === 'o') { e.preventDefault(); openImageFile(); return; }
      if (ctrl && !e.shiftKey && key === 's') { e.preventDefault(); exportProject('png'); return; }
      if (ctrl && e.shiftKey && key === 's') { e.preventDefault(); exportProject('jpeg'); return; }
      if (ctrl && key === 'w') { e.preventDefault(); if (p) s.closeProject(p.id); return; }

      // ---- Edit ----
      if (ctrl && key === 'z') { e.preventDefault(); e.shiftKey ? s.redo() : s.undo(); return; }
      if (ctrl && key === 'y') { e.preventDefault(); s.redo(); return; }
      if (ctrl && key === 'c') { e.preventDefault(); if (activeId) s.copyLayer(activeId); return; }
      if (ctrl && key === 'x') {
        e.preventDefault();
        if (activeId) { s.copyLayer(activeId); s.deleteLayer(activeId); }
        return;
      }
      if (ctrl && key === 'v') { e.preventDefault(); s.pasteLayer(); return; }
      if (ctrl && e.altKey && key === 'i') { e.preventDefault(); s.setDialog('imageSize'); return; }
      if (ctrl && e.altKey && key === 'c') { e.preventDefault(); s.setDialog('canvasSize'); return; }
      if (ctrl && key === 't') { e.preventDefault(); s.beginTransform(); return; }

      // ---- Select ----
      if (ctrl && key === 'a') {
        e.preventDefault();
        if (p) s.setSelection({ x: 0, y: 0, width: p.width, height: p.height, type: 'rect' });
        return;
      }
      if (ctrl && e.shiftKey && key === 'd') { e.preventDefault(); s.reselect(); return; }
      if (ctrl && key === 'd') { e.preventDefault(); s.setSelection(null); return; }

      // ---- Fill / clear (Alt/Ctrl + Backspace) ----
      if ((e.altKey || ctrl) && (key === 'backspace' || key === 'delete')) {
        e.preventDefault();
        s.pushHistory('Fill');
        s.fillSelection(e.altKey ? 'foreground' : 'background');
        forceUpdate(n => n + 1);
        return;
      }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        if (s.selection) {
          s.pushHistory('Erase');
          s.clearSelectionPixels();
        } else if (activeId) {
          s.deleteLayer(activeId);
        }
        return;
      }

      // ---- Layers ----
      if (ctrl && e.shiftKey && key === 'n') { e.preventDefault(); s.addLayer('pixel'); return; }
      if (ctrl && key === 'j') { e.preventDefault(); if (activeId) s.duplicateLayer(activeId); return; }
      if (ctrl && e.shiftKey && key === 'e') { e.preventDefault(); s.pushHistory('Merge Visible'); s.mergeVisible(); return; }
      if (ctrl && !e.shiftKey && key === 'e') { e.preventDefault(); if (activeId) s.mergeDown(); return; }
      if (ctrl && key === ']') { e.preventDefault(); if (activeId) s.moveLayer(activeId, e.shiftKey ? 'top' : 'up'); return; }
      if (ctrl && key === '[') { e.preventDefault(); if (activeId) s.moveLayer(activeId, e.shiftKey ? 'bottom' : 'down'); return; }
      if (e.altKey && key === ']') { e.preventDefault(); s.selectLayerRelative(1); return; }
      if (e.altKey && key === '[') { e.preventDefault(); s.selectLayerRelative(-1); return; }

      // ---- View ----
      if (ctrl && key === 'f') { e.preventDefault(); s.setCommandPaletteOpen(true); return; }
      if (ctrl && key === '0') { e.preventDefault(); s.fitToScreen(); return; }
      if (ctrl && key === '1') { e.preventDefault(); s.setZoom(1); return; }
      if (ctrl && (key === '=' || key === '+')) { e.preventDefault(); s.zoomIn(); return; }
      if (ctrl && key === '-') { e.preventDefault(); s.zoomOut(); return; }
      if (ctrl && key === 'r') { e.preventDefault(); s.toggleRulers(); return; }
      if (ctrl && (e.key === "'" || key === "'")) { e.preventDefault(); s.toggleGrid(); return; }
      if (ctrl && e.key === ';') { e.preventDefault(); s.toggleGuides(); return; }

      // ---- Adjustments ----
      if (ctrl && key === 'l') { e.preventDefault(); s.setDialog('levels'); return; }
      if (ctrl && key === 'm') { e.preventDefault(); s.setDialog('curves'); return; }
      if (ctrl && key === 'u' && !e.shiftKey) { e.preventDefault(); s.setDialog('hsl'); return; }
      if (ctrl && e.shiftKey && key === 'u') { e.preventDefault(); applyActiveAdjustment('bw', {}, 'Black & White'); forceUpdate(n => n + 1); return; }
      if (ctrl && key === 'i') { e.preventDefault(); applyActiveAdjustment('invert', {}, 'Invert'); forceUpdate(n => n + 1); return; }

      // ---- Panels / fullscreen ----
      if (key === 'tab') { e.preventDefault(); s.toggleFullscreen(); return; }
      if (!ctrl && !e.altKey && key === 'f') { s.toggleFullscreen(); return; }
      if (e.key === '?') { e.preventDefault(); s.setDialog('shortcuts'); return; }

      // ---- Arrow-key nudge ----
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight' || e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        if (s.crop?.active || s.transform?.active) return;
        e.preventDefault();
        const step = e.shiftKey ? 10 : 1;
        const dx = e.key === 'ArrowLeft' ? -step : e.key === 'ArrowRight' ? step : 0;
        const dy = e.key === 'ArrowUp' ? -step : e.key === 'ArrowDown' ? step : 0;
        s.nudgeLayer(dx, dy);
        return;
      }

      // ---- Brush size / hardness ----
      if (key === '[') { e.preventDefault(); s.setTool(e.shiftKey ? { brushHardness: Math.max(0, s.tool.brushHardness - 10) } : { brushSize: Math.max(1, s.tool.brushSize - 2) }); return; }
      if (key === ']') { e.preventDefault(); s.setTool(e.shiftKey ? { brushHardness: Math.min(100, s.tool.brushHardness + 10) } : { brushSize: Math.min(500, s.tool.brushSize + 2) }); return; }

      // ---- Number keys: opacity / flow ----
      if (!ctrl && !e.altKey && /^[0-9]$/.test(e.key)) {
        const n = parseInt(e.key, 10);
        const value = n === 0 ? 100 : n * 10;
        e.preventDefault();
        s.setTool(e.shiftKey ? { brushFlow: value } : { brushOpacity: value });
        return;
      }

      // ---- Tool shortcuts (repeat the key to cycle the group) ----
      if (!ctrl && !e.altKey && key.length === 1) {
        const groups: Record<string, any[]> = {
          v: ['move'], m: ['marquee'], l: ['lasso'], w: ['magic'], c: ['crop'],
          i: ['eyedropper'], b: ['brush'], e: ['eraser'], g: ['fill', 'gradient'],
          u: ['shape'], t: ['text'], s: ['clone'], r: ['blur'], h: ['hand'], z: ['zoom'],
        };
        const group = groups[key];
        if (group) {
          e.preventDefault();
          let next = group[0];
          if (group.length > 1) {
            const cur = group.indexOf(s.tool.id);
            next = cur === -1 ? group[0] : group[(cur + 1) % group.length];
          }
          s.setToolId(next);
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // Release spacebar pan
  useEffect(() => {
    const up = (e: KeyboardEvent) => { if (e.key === ' ') spaceDown.current = false; };
    window.addEventListener('keyup', up);
    return () => window.removeEventListener('keyup', up);
  }, []);

  // Double-click a text layer to edit it
  const handleCanvasDoubleClick = useCallback((e: React.MouseEvent) => {
    if (!activeProject) return;
    const pos = getCanvasPos(e);
    const hit = [...activeProject.layers].reverse().find(l =>
      l.type === 'text' && l.visible &&
      pos.x >= l.x && pos.x <= l.x + l.width &&
      pos.y >= l.y && pos.y <= l.y + l.height
    );
    if (hit) {
      store.selectLayer(hit.id);
      store.setToolId('text');
      forceUpdate(n => n + 1);
    }
  }, [activeProject, getCanvasPos, store]);

  if (!activeProject) {
    return <div className="canvas-area"><div style={{ color: '#666', fontSize: 14 }}>{t('status.noProject')}</div></div>;
  }

  const displayWidth = activeProject.width * activeProject.zoom;
  const displayHeight = activeProject.height * activeProject.zoom;
  const paintTool = ['brush', 'eraser', 'blur', 'clone'].includes(store.tool.id);
  const panning = store.tool.id === 'hand' || spaceDown.current;
  const cursorClass =
    store.tool.id === 'move' ? 'tool-move' :
    store.tool.id === 'zoom' ? 'tool-zoom' :
    store.tool.id === 'eyedropper' ? 'tool-eyedropper' : '';

  return (
    <div className="canvas-area" ref={containerRef}>
      {/* Rulers: drag out of a ruler to create a guide */}
      {store.showRulers && (
        <>
          <canvas
            ref={rulerHRef}
            style={{ position: 'absolute', top: 0, left: 0, zIndex: 6, cursor: 'row-resize' }}
            onMouseDown={startGuideDrag('horizontal')}
            title={t('sc.guides')}
          />
          <canvas
            ref={rulerVRef}
            style={{ position: 'absolute', top: 0, left: 0, zIndex: 6, cursor: 'col-resize' }}
            onMouseDown={startGuideDrag('vertical')}
            title={t('sc.guides')}
          />
        </>
      )}
      <div className="canvas-wrapper" style={{ transform: `translate(${activeProject.panX}px, ${activeProject.panY}px)` }}>
        <canvas
          ref={canvasRef}
          style={{
            width: displayWidth,
            height: displayHeight,
            cursor: paintTool ? 'none' : panning ? 'grab' : undefined,
          }}
          className={cursorClass}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={() => { handleMouseUp(); cursorPos.current = null; forceUpdate(n => n + 1); }}
          onWheel={handleWheel}
          onDoubleClick={handleCanvasDoubleClick}
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
              <option value="free">{t('crop.free')}</option>
              <option value="1:1">1:1</option>
              <option value="3:4">3:4</option>
              <option value="4:3">4:3</option>
              <option value="9:16">9:16</option>
              <option value="16:9">16:9</option>
            </select>
            <button className="btn btn-primary" style={{ padding: '2px 10px', fontSize: 11 }} onClick={() => store.applyCrop()}>{t('crop.apply')}</button>
            <button className="btn" style={{ padding: '2px 10px', fontSize: 11 }} onClick={() => store.cancelCrop()}>{t('crop.cancel')}</button>
          </div>
        )}
      </div>
    </div>
  );
}
