import { useRef, useEffect, useState, useCallback } from 'react';
import { useEditorStore } from '@/store/editorStore';
import { renderProject } from '@/engine/renderer';
import { floodFill } from '@/engine/filters';
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

    // Set canvas size
    canvas.width = activeProject.width;
    canvas.height = activeProject.height;
    overlay.width = activeProject.width;
    overlay.height = activeProject.height;

    // Render project
    renderProject(activeProject, ctx, activeProject.width, activeProject.height);

    // Clear overlay
    octx.clearRect(0, 0, overlay.width, overlay.height);

    // Draw selection
    if (store.selection) {
      const sel = store.selection;
      octx.strokeStyle = '#000';
      octx.lineWidth = 1;
      octx.setLineDash([4, 4]);
      octx.strokeRect(sel.x, sel.y, sel.width, sel.height);
      octx.strokeStyle = '#fff';
      octx.lineDashOffset = 4;
      octx.strokeRect(sel.x, sel.y, sel.width, sel.height);
      octx.setLineDash([]);
    }

    // Draw shape preview
    if (shapePreview.current && isDrawing.current) {
      const s = shapePreview.current;
      octx.strokeStyle = '#3a8ee6';
      octx.lineWidth = 1;
      octx.setLineDash([4, 4]);
      octx.strokeRect(s.x, s.y, s.w, s.h);
      octx.setLineDash([]);
    }
  });

  // Rerender on store changes
  useEffect(() => {
    forceUpdate(n => n + 1);
  }, [store.projects, store.selection, store.tool]);

  const getCanvasPos = useCallback((e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas || !activeProject) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: Math.round((e.clientX - rect.left) * scaleX),
      y: Math.round((e.clientY - rect.top) * scaleY),
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
    const color = hexToRgb(tool.brushColor);

    ctx.save();
    ctx.globalAlpha = (tool.brushOpacity / 100) * (tool.brushFlow / 100);

    if (tool.id === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.strokeStyle = 'rgba(0,0,0,1)';
    } else {
      ctx.strokeStyle = tool.brushColor;
    }

    ctx.lineWidth = tool.brushSize;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Apply selection clip
    if (store.selection) {
      const sel = store.selection;
      ctx.save();
      ctx.beginPath();
      ctx.rect(sel.x, sel.y, sel.width, sel.height);
      ctx.clip();
    }

    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();

    if (store.selection) {
      ctx.restore();
    }
    ctx.restore();
  }, [getActiveLayer, store.tool, store.selection]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    const pos = getCanvasPos(e);
    const tool = store.tool;
    const layer = getActiveLayer();

    if (tool.id === 'hand' || e.button === 1 || (e.button === 0 && e.altKey)) {
      isDrawing.current = true;
      lastPos.current = { x: e.clientX, y: e.clientY };
      return;
    }

    if (tool.id === 'zoom') {
      if (e.altKey) {
        store.setZoom(Math.max(0.05, activeProject!.zoom / 1.25));
      } else {
        store.setZoom(Math.min(16, activeProject!.zoom * 1.25));
      }
      return;
    }

    if (tool.id === 'eyedropper' && layer?.canvas) {
      const ctx = layer.canvas.getContext('2d')!;
      const pixel = ctx.getImageData(pos.x, pos.y, 1, 1).data;
      store.setTool({ brushColor: `#${[pixel[0], pixel[1], pixel[2]].map(v => v.toString(16).padStart(2, '0')).join('')}` });
      return;
    }

    if (tool.id === 'fill' && layer?.canvas) {
      const ctx = layer.canvas.getContext('2d')!;
      const color = hexToRgb(tool.brushColor);
      store.pushHistory('Fill');
      floodFill(ctx, pos.x, pos.y, { r: color.r, g: color.g, b: color.b, a: 255 }, 32);
      forceUpdate(n => n + 1);
      return;
    }

    if (tool.id === 'clone') {
      if (e.altKey || !cloneSource.current) {
        cloneSource.current = pos;
        return;
      }
    }

    if (tool.id === 'move' && layer) {
      isDrawing.current = true;
      lastPos.current = pos;
      store.pushHistory('Move');
      return;
    }

    if ((tool.id === 'marquee' || tool.id === 'shape') && layer) {
      isDrawing.current = true;
      startPos.current = pos;
      shapePreview.current = { x: pos.x, y: pos.y, w: 0, h: 0 };
      return;
    }

    // Brush, eraser, blur
    if ((tool.id === 'brush' || tool.id === 'eraser' || tool.id === 'blur' || tool.id === 'clone') && layer?.canvas) {
      isDrawing.current = true;
      lastPos.current = pos;
      if (tool.id !== 'clone' || cloneSource.current) {
        store.pushHistory(tool.id === 'eraser' ? 'Erase' : 'Paint');
      }
      drawBrushStroke(pos, pos);
      forceUpdate(n => n + 1);
      return;
    }

    // Text tool: create text layer on click
    if (tool.id === 'text') {
      store.addLayer('text');
      const s = useEditorStore.getState();
      const p = s.projects.find(p => p.id === s.activeProjectId);
      const newLayer = p?.layers.find(l => l.id === p?.activeLayerId);
      if (newLayer) {
        newLayer.x = pos.x;
        newLayer.y = pos.y;
        newLayer.text = 'Text';
        newLayer.fontSize = tool.fontSize;
        newLayer.fontFamily = tool.fontFamily;
        newLayer.textColor = tool.brushColor;
        newLayer.textAlign = tool.textAlign;
      }
      forceUpdate(n => n + 1);
      return;
    }
  }, [getCanvasPos, getActiveLayer, store, activeProject, drawBrushStroke]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const pos = getCanvasPos(e);
    const tool = store.tool;

    if (tool.id === 'hand' || (isDrawing.current && (e.buttons === 4 || (e.altKey && e.buttons === 1)))) {
      if (lastPos.current) {
        const dx = e.clientX - lastPos.current.x;
        const dy = e.clientY - lastPos.current.y;
        store.setPan(activeProject!.panX + dx, activeProject!.panY + dy);
        lastPos.current = { x: e.clientX, y: e.clientY };
      }
      return;
    }

    if (!isDrawing.current) return;

    if (tool.id === 'move') {
      const layer = getActiveLayer();
      if (layer && lastPos.current) {
        layer.x += pos.x - lastPos.current.x;
        layer.y += pos.y - lastPos.current.y;
        lastPos.current = pos;
        forceUpdate(n => n + 1);
      }
      return;
    }

    if ((tool.id === 'marquee' || tool.id === 'shape') && startPos.current) {
      const x = Math.min(startPos.current.x, pos.x);
      const y = Math.min(startPos.current.y, pos.y);
      const w = Math.abs(pos.x - startPos.current.x);
      const h = Math.abs(pos.y - startPos.current.y);
      shapePreview.current = { x, y, w, h };
      forceUpdate(n => n + 1);
      return;
    }

    if ((tool.id === 'brush' || tool.id === 'eraser' || tool.id === 'blur' || tool.id === 'clone') && lastPos.current) {
      if (tool.id === 'clone' && cloneSource.current) {
        // Clone stamp: sample from source offset
        const layer = getActiveLayer();
        if (layer?.canvas) {
          const ctx = layer.canvas.getContext('2d')!;
          const dx = pos.x - lastPos.current.x;
          const dy = pos.y - lastPos.current.y;
          cloneSource.current.x += dx;
          cloneSource.current.y += dy;
          // Sample from a merged canvas or current visible
          const merged = document.createElement('canvas');
          merged.width = layer.width;
          merged.height = layer.height;
          const mctx = merged.getContext('2d')!;
          renderProject(activeProject!, mctx, layer.width, layer.height);
          ctx.save();
          ctx.globalAlpha = store.tool.brushOpacity / 100;
          const size = store.tool.brushSize;
          ctx.beginPath();
          ctx.arc(pos.x, pos.y, size / 2, 0, Math.PI * 2);
          ctx.clip();
          ctx.drawImage(merged, cloneSource.current.x - pos.x, cloneSource.current.y - pos.y);
          ctx.restore();
        }
      } else {
        drawBrushStroke(lastPos.current, pos);
      }
      lastPos.current = pos;
      forceUpdate(n => n + 1);
    }
  }, [getCanvasPos, getActiveLayer, store, activeProject, drawBrushStroke]);

  const handleMouseUp = useCallback(() => {
    const tool = store.tool;

    if ((tool.id === 'marquee') && shapePreview.current) {
      const s = shapePreview.current;
      if (s.w > 2 && s.h > 2) {
        store.setSelection({ x: s.x, y: s.y, width: s.w, height: s.h, type: 'rect' });
      }
    }

    if (tool.id === 'shape' && shapePreview.current) {
      const s = shapePreview.current;
      if (s.w > 2 && s.h > 2) {
        store.addLayer('shape');
        const st = useEditorStore.getState();
        const p = st.projects.find(p => p.id === st.activeProjectId);
        const newLayer = p?.layers.find(l => l.id === p?.activeLayerId);
        if (newLayer) {
          newLayer.x = s.x;
          newLayer.y = s.y;
          newLayer.width = s.w;
          newLayer.height = s.h;
          newLayer.shapeType = tool.shapeType;
          newLayer.shapeFill = tool.shapeFill;
          newLayer.shapeStroke = tool.shapeStroke;
          newLayer.shapeStrokeWidth = tool.shapeStrokeWidth;
        }
      }
    }

    isDrawing.current = false;
    lastPos.current = null;
    startPos.current = null;
    shapePreview.current = null;
    forceUpdate(n => n + 1);
  }, [store]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    if (e.ctrlKey || e.metaKey) {
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      store.setZoom(Math.max(0.05, Math.min(16, activeProject!.zoom * delta)));
    } else {
      store.setPan(activeProject!.panX - e.deltaX, activeProject!.panY - e.deltaY);
    }
  }, [store, activeProject]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).tagName === 'INPUT' || (e.target as HTMLElement).tagName === 'SELECT') return;
      const s = useEditorStore.getState();
      const key = e.key.toLowerCase();
      const ctrl = e.ctrlKey || e.metaKey;

      if (ctrl && key === 'z') {
        e.preventDefault();
        if (e.shiftKey) s.redo(); else s.undo();
        return;
      }
      if (ctrl && key === 'a') {
        e.preventDefault();
        const p = s.projects.find(p => p.id === s.activeProjectId);
        if (p) s.setSelection({ x: 0, y: 0, width: p.width, height: p.height, type: 'rect' });
        return;
      }
      if (ctrl && key === 'd') {
        e.preventDefault();
        s.setSelection(null);
        return;
      }
      if (ctrl && key === 'j') {
        e.preventDefault();
        const p = s.projects.find(p => p.id === s.activeProjectId);
        if (p?.activeLayerId) s.duplicateLayer(p.activeLayerId);
        return;
      }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        const p = s.projects.find(p => p.id === s.activeProjectId);
        if (p?.activeLayerId) s.deleteLayer(p.activeLayerId);
        return;
      }

      // Tool shortcuts (single key, no modifiers)
      if (!ctrl && !e.altKey && key.length === 1) {
        const toolMap: Record<string, any> = {
          v: 'move', m: 'marquee', l: 'lasso', w: 'magic', b: 'brush',
          e: 'eraser', g: 'fill', i: 'eyedropper', u: 'shape', t: 'text',
          s: 'clone', r: 'blur', h: 'hand', z: 'zoom', c: 'crop',
        };
        if (toolMap[key]) {
          e.preventDefault();
          s.setToolId(toolMap[key]);
        }
      }

      // Bracket keys for brush size
      if (key === '[') {
        s.setTool({ brushSize: Math.max(1, s.tool.brushSize - 2) });
      }
      if (key === ']') {
        s.setTool({ brushSize: Math.min(500, s.tool.brushSize + 2) });
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  if (!activeProject) {
    return (
      <div className="canvas-area">
        <div style={{ color: '#666', fontSize: 14 }}>No project open. Create a new project to get started.</div>
      </div>
    );
  }

  const displayWidth = activeProject.width * activeProject.zoom;
  const displayHeight = activeProject.height * activeProject.zoom;

  const cursorClass =
    store.tool.id === 'move' ? 'tool-move' :
    store.tool.id === 'hand' ? 'tool-hand' :
    store.tool.id === 'zoom' ? 'tool-zoom' :
    store.tool.id === 'eyedropper' ? 'tool-eyedropper' : '';

  return (
    <div className="canvas-area" ref={containerRef}>
      <div
        className="canvas-wrapper"
        style={{
          transform: `translate(${activeProject.panX}px, ${activeProject.panY}px)`,
        }}
      >
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
        <canvas
          ref={overlayRef}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: displayWidth,
            height: displayHeight,
            pointerEvents: 'none',
          }}
        />
      </div>
    </div>
  );
}
