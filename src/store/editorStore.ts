import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type {
  AppState, ProjectState, LayerData, ToolId, ToolState, Selection, BlendMode, Language, CropState,
} from '@/types';
import { uid, createCanvas } from '@/engine/colorUtils';
import { measureTextLayer } from '@/engine/textUtils';

const LANG_STORAGE_KEY = 'compositor-web.lang';

function loadLanguage(): Language {
  try {
    const saved = localStorage.getItem(LANG_STORAGE_KEY);
    if (saved === 'en' || saved === 'zh') return saved;
  } catch {
    // ignore (e.g. SSR / blocked storage)
  }
  return 'en';
}

const DEFAULT_SHORTCUTS: Record<string, string> = {
  'v': 'move',
  'm': 'marquee',
  'l': 'lasso',
  'w': 'magic',
  'b': 'brush',
  'e': 'eraser',
  'g': 'fill',
  'i': 'eyedropper',
  'u': 'shape',
  't': 'text',
  's': 'clone',
  'r': 'blur',
  'h': 'hand',
  'z': 'zoom',
  'c': 'crop',
  'CmdOrCtrl+z': 'undo',
  'CmdOrCtrl+Shift+z': 'redo',
  'CmdOrCtrl+n': 'newProject',
  'CmdOrCtrl+s': 'save',
  'CmdOrCtrl+e': 'exportPng',
  'CmdOrCtrl+Shift+e': 'exportJpeg',
  'CmdOrCtrl+a': 'selectAll',
  'CmdOrCtrl+d': 'deselect',
  'CmdOrCtrl+j': 'duplicateLayer',
  'CmdOrCtrl+]': 'layerUp',
  'CmdOrCtrl+[': 'layerDown',
  'CmdOrCtrl+Shift+]': 'layerTop',
  'CmdOrCtrl+Shift+[': 'layerBottom',
  'Delete': 'deleteLayer',
  'F': 'fullscreen',
  'CmdOrCtrl+r': 'toggleRulers',
};

function createDefaultProject(width = 800, height = 600, name = 'Untitled'): ProjectState {
  const bgCanvas = createCanvas(width, height);
  const ctx = bgCanvas.getContext('2d')!;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);

  const bgLayer: LayerData = {
    id: uid(),
    name: 'Background',
    visible: true,
    locked: false,
    opacity: 100,
    blendMode: 'normal',
    canvas: bgCanvas,
    x: 0,
    y: 0,
    width,
    height,
    mask: null,
    maskEnabled: false,
    type: 'pixel',
    rotation: 0,
    scaleX: 1,
    scaleY: 1,
    flippedH: false,
    flippedV: false,
  };

  return {
    id: uid(),
    name,
    width,
    height,
    background: '#ffffff',
    layers: [bgLayer],
    activeLayerId: bgLayer.id,
    zoom: 1,
    panX: 0,
    panY: 0,
    guides: [],
  };
}

function defaultToolState(): ToolState {
  return {
    id: 'brush',
    brushSize: 10,
    brushHardness: 80,
    brushOpacity: 100,
    brushFlow: 100,
    brushColor: '#000000',
    shapeType: 'rect',
    shapeFill: '#3b82f6',
    shapeStroke: '#000000',
    shapeStrokeWidth: 1,
    fontSize: 24,
    fontFamily: 'Arial',
    textAlign: 'left',
    gradientType: 'linear',
  };
}

interface StoreActions {
  // Project management
  newProject: (width?: number, height?: number, name?: string) => void;
  closeProject: (id: string) => void;
  setActiveProject: (id: string) => void;
  renameProject: (id: string, name: string) => void;
  resizeCanvas: (width: number, height: number) => void;

  // Layer management
  addLayer: (type?: LayerData['type'], name?: string) => void;
  deleteLayer: (id: string) => void;
  duplicateLayer: (id: string) => void;
  selectLayer: (id: string) => void;
  moveLayer: (id: string, direction: 'up' | 'down' | 'top' | 'bottom') => void;
  reorderLayer: (id: string, targetIndex: number) => void;
  setLayerVisibility: (id: string, visible: boolean) => void;
  setLayerOpacity: (id: string, opacity: number) => void;
  setLayerBlendMode: (id: string, mode: BlendMode) => void;
  renameLayer: (id: string, name: string) => void;
  mergeDown: () => void;
  mergeVisible: () => void;
  selectLayerRelative: (delta: number) => void;
  addLayerMask: (layerId: string) => void;

  // Tool management
  setTool: (tool: Partial<ToolState>) => void;
  setToolId: (id: ToolId) => void;

  // Selection
  setSelection: (sel: Selection | null) => void;
  reselect: () => void;
  fillSelection: (mode: 'foreground' | 'background') => void;
  clearSelectionPixels: () => void;

  // History
  pushHistory: (description: string) => void;
  undo: () => void;
  redo: () => void;

  // UI
  togglePanel: (panel: 'layers' | 'properties' | 'history') => void;
  toggleRulers: () => void;
  toggleGrid: () => void;
  toggleGuides: () => void;
  setGridSize: (size: number) => void;
  toggleFullscreen: () => void;
  toggleNavigator: () => void;
  setDialog: (type: AppState['dialog']['type']) => void;
  setCommandPaletteOpen: (open: boolean) => void;
  setLanguage: (lang: Language) => void;

  // Canvas
  setZoom: (zoom: number) => void;
  setPan: (x: number, y: number) => void;
  fitToScreen: () => void;
  zoomIn: () => void;
  zoomOut: () => void;

  // Clipboard
  copyLayer: (id: string) => void;
  pasteLayer: () => void;

  // Transform
  beginTransform: () => void;
  updateTransform: (handle: string, dx: number, dy: number) => void;
  applyTransform: () => void;
  cancelTransform: () => void;
  flipLayer: (axis: 'horizontal' | 'vertical') => void;
  flipCanvas: (axis: 'horizontal' | 'vertical') => void;
  rotateLayer: (degrees: number) => void;

  // Crop
  beginCrop: () => void;
  setCropRatio: (ratio: string | null) => void;
  updateCrop: (patch: Partial<CropState>) => void;
  applyCrop: () => void;
  cancelCrop: () => void;

  // Guides
  addGuide: (orientation: 'horizontal' | 'vertical', position: number) => void;
  removeGuide: (id: string) => void;
  clearGuides: () => void;

  // Layer effects
  setLayerEffect: (layerId: string, effect: Partial<LayerData['effects']>) => void;

  // Layer transform properties
  setLayerRotation: (layerId: string, rotation: number) => void;
  setLayerScale: (layerId: string, sx: number, sy: number) => void;

  // Generic layer patching (use this instead of mutating layer objects directly,
  // since Immer state is frozen and direct assignment throws at runtime).
  updateLayer: (id: string, patch: Partial<LayerData>) => void;
  updateTextLayer: (id: string, patch: Partial<LayerData>) => void;
  nudgeLayer: (dx: number, dy: number) => void;

  // History navigation
  jumpHistory: (index: number) => void;

  // Project size / image import
  resizeImage: (width: number, height: number) => void;
  openImage: (name: string, img: HTMLImageElement) => void;
}

export const useEditorStore = create<AppState & StoreActions>()(
  immer((set, get) => ({
    projects: [createDefaultProject()],
    activeProjectId: null,
    tool: defaultToolState(),
    selection: null,
    lastSelection: null,
    history: [],
    historyIndex: -1,
    clipboard: null,
    showRulers: true,
    showGrid: false,
    showGuides: true,
    gridSize: 50,
    fullscreen: false,
    showNavigator: false,
    transform: null,
    crop: null,
    dialog: { type: null },
    commandPaletteOpen: false,
    language: loadLanguage(),
    panels: { layers: true, properties: true, history: true },
    keyboardShortcuts: DEFAULT_SHORTCUTS,

    newProject: (width = 800, height = 600, name = 'Untitled') => {
      set((state: any) => {
        const project = createDefaultProject(width, height, name);
        state.projects.push(project);
        state.activeProjectId = project.id;
        state.history = [];
        state.historyIndex = -1;
      });
    },

    closeProject: (id) => {
      set((state: any) => {
        const idx = state.projects.findIndex((p: any) => p.id === id);
        if (idx === -1) return;
        state.projects.splice(idx, 1);
        if (state.activeProjectId === id) {
          state.activeProjectId = state.projects.length > 0 ? state.projects[state.projects.length - 1].id : null;
        }
      });
    },

    setActiveProject: (id) => set((state: any) => { state.activeProjectId = id; }),

    renameProject: (id, name) => set((state: any) => {
      const p = state.projects.find((p: any) => p.id === id);
      if (p) p.name = name;
    }),

    resizeCanvas: (width, height) => set((state: any) => {
      const p = state.projects.find((p: any) => p.id === state.activeProjectId);
      if (!p) return;
      p.width = width;
      p.height = height;
    }),

    addLayer: (type = 'pixel', name) => set((state: any) => {
      const p = state.projects.find((p: any) => p.id === state.activeProjectId);
      if (!p) return;
      const canvas = createCanvas(p.width, p.height);
      const layer: LayerData = {
        id: uid(),
        name: name || `Layer ${p.layers.length}`,
        visible: true,
        locked: false,
        opacity: 100,
        blendMode: 'normal',
        canvas,
        x: 0,
        y: 0,
        width: p.width,
        height: p.height,
        mask: null,
        maskEnabled: false,
        type,
        rotation: 0,
        scaleX: 1,
        scaleY: 1,
        flippedH: false,
        flippedV: false,
      };
      if (type === 'text') {
        layer.text = 'Text';
        layer.fontSize = 24;
        layer.fontFamily = 'Arial';
        layer.textColor = '#000000';
        layer.textAlign = 'left';
        const m = measureTextLayer(layer);
        layer.width = m.width;
        layer.height = m.height;
      } else if (type === 'shape') {
        layer.shapeType = 'rect';
        layer.shapeFill = '#3b82f6';
        layer.shapeStroke = 'transparent';
        layer.shapeStrokeWidth = 0;
      } else if (type === 'gradient') {
        layer.gradient = {
          type: 'linear',
          colors: [
            { stop: 0, color: '#3b82f6' },
            { stop: 1, color: '#8b5cf6' },
          ],
          angle: 0,
          scale: 100,
        };
      }
      const activeIdx = p.layers.findIndex((l: any) => l.id === p.activeLayerId);
      p.layers.splice(activeIdx + 1, 0, layer);
      p.activeLayerId = layer.id;
    }),

    deleteLayer: (id) => set((state: any) => {
      const p = state.projects.find((p: any) => p.id === state.activeProjectId);
      if (!p) return;
      const idx = p.layers.findIndex((l: any) => l.id === id);
      if (idx === -1 || p.layers.length <= 1) return;
      p.layers.splice(idx, 1);
      if (p.activeLayerId === id) {
        p.activeLayerId = p.layers[Math.max(0, idx - 1)].id;
      }
    }),

    duplicateLayer: (id) => set((state: any) => {
      const p = state.projects.find((p: any) => p.id === state.activeProjectId);
      if (!p) return;
      const idx = p.layers.findIndex((l: any) => l.id === id);
      if (idx === -1) return;
      const src = p.layers[idx];
      const newCanvas = createCanvas(src.width, src.height);
      if (src.canvas) {
        newCanvas.getContext('2d')!.drawImage(src.canvas as HTMLCanvasElement, 0, 0);
      }
      const copy: LayerData = {
        ...src,
        id: uid(),
        name: src.name + ' copy',
        canvas: newCanvas,
        mask: null,
      };
      p.layers.splice(idx + 1, 0, copy);
      p.activeLayerId = copy.id;
    }),

    selectLayer: (id) => set((state: any) => {
      const p = state.projects.find((p: any) => p.id === state.activeProjectId);
      if (p) p.activeLayerId = id;
    }),

    moveLayer: (id, direction) => set((state: any) => {
      const p = state.projects.find((p: any) => p.id === state.activeProjectId);
      if (!p) return;
      const idx = p.layers.findIndex((l: any) => l.id === id);
      if (idx === -1) return;
      let newIdx = idx;
      if (direction === 'up' && idx < p.layers.length - 1) newIdx = idx + 1;
      if (direction === 'down' && idx > 0) newIdx = idx - 1;
      if (direction === 'top') newIdx = p.layers.length - 1;
      if (direction === 'bottom') newIdx = 0;
      if (newIdx !== idx) {
        const [layer] = p.layers.splice(idx, 1);
        p.layers.splice(newIdx, 0, layer);
      }
    }),

    reorderLayer: (id, targetIndex) => set((state: any) => {
      const p = state.projects.find((p: any) => p.id === state.activeProjectId);
      if (!p) return;
      const idx = p.layers.findIndex((l: any) => l.id === id);
      if (idx === -1) return;
      const [layer] = p.layers.splice(idx, 1);
      p.layers.splice(targetIndex, 0, layer);
    }),

    setLayerVisibility: (id, visible) => set((state: any) => {
      const p = state.projects.find((p: any) => p.id === state.activeProjectId);
      const layer = p?.layers.find((l: any) => l.id === id);
      if (layer) layer.visible = visible;
    }),

    setLayerOpacity: (id, opacity) => set((state: any) => {
      const p = state.projects.find((p: any) => p.id === state.activeProjectId);
      const layer = p?.layers.find((l: any) => l.id === id);
      if (layer) layer.opacity = opacity;
    }),

    setLayerBlendMode: (id, mode) => set((state: any) => {
      const p = state.projects.find((p: any) => p.id === state.activeProjectId);
      const layer = p?.layers.find((l: any) => l.id === id);
      if (layer) layer.blendMode = mode;
    }),

    renameLayer: (id, name) => set((state: any) => {
      const p = state.projects.find((p: any) => p.id === state.activeProjectId);
      const layer = p?.layers.find((l: any) => l.id === id);
      if (layer) layer.name = name;
    }),

    mergeDown: () => set((state: any) => {
      const p = state.projects.find((p: any) => p.id === state.activeProjectId);
      if (!p) return;
      const idx = p.layers.findIndex((l: any) => l.id === p.activeLayerId);
      if (idx <= 0) return;
      const top = p.layers[idx];
      const bottom = p.layers[idx - 1];
      if (!top.canvas || !bottom.canvas) return;
      const ctx = (bottom.canvas as HTMLCanvasElement).getContext('2d')!;
      ctx.globalAlpha = top.opacity / 100;
      const modeMap: Record<string, GlobalCompositeOperation> = {
        normal: 'source-over', multiply: 'multiply', screen: 'screen',
        overlay: 'overlay', darken: 'darken', lighten: 'lighten',
        'color-dodge': 'color-dodge', 'color-burn': 'color-burn',
        'hard-light': 'hard-light', 'soft-light': 'soft-light',
      };
      ctx.globalCompositeOperation = modeMap[top.blendMode] || 'source-over';
      ctx.drawImage(top.canvas as HTMLCanvasElement, top.x - bottom.x, top.y - bottom.y);
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
      p.layers.splice(idx, 1);
      p.activeLayerId = bottom.id;
    }),

    mergeVisible: () => set((state: any) => {
      const p = state.projects.find((p: any) => p.id === state.activeProjectId);
      if (!p) return;
      const visible = p.layers.filter((l: any) => l.visible && (l.type === 'pixel' || l.type === 'text' || l.type === 'shape' || l.type === 'gradient'));
      if (visible.length < 1) return;
      const merged = createCanvas(p.width, p.height);
      const mctx = merged.getContext('2d')!;
      for (const layer of p.layers) {
        if (!layer.visible) continue;
        mctx.save();
        mctx.globalAlpha = layer.opacity / 100;
        const cx = layer.x + layer.width / 2;
        const cy = layer.y + layer.height / 2;
        mctx.translate(cx, cy);
        mctx.rotate(((layer.rotation || 0) * Math.PI) / 180);
        mctx.scale((layer.scaleX || 1) * (layer.flippedH ? -1 : 1), (layer.scaleY || 1) * (layer.flippedV ? -1 : 1));
        mctx.translate(-layer.width / 2, -layer.height / 2);
        if (layer.canvas) {
          mctx.drawImage(layer.canvas as HTMLCanvasElement, 0, 0);
        } else if (layer.type === 'text' && layer.text) {
          mctx.font = `${layer.fontSize || 24}px ${layer.fontFamily || 'Arial'}`;
          mctx.fillStyle = layer.textColor || '#000000';
          mctx.textAlign = (layer.textAlign || 'left') as CanvasTextAlign;
          mctx.textBaseline = 'top';
          const lines = layer.text.split('\n');
          const lh = (layer.fontSize || 24) * 1.2;
          let sx = 0;
          if (layer.textAlign === 'center') sx += layer.width / 2;
          else if (layer.textAlign === 'right') sx += layer.width;
          lines.forEach((line: string, i: number) => mctx.fillText(line, sx, i * lh));
        } else if (layer.type === 'shape') {
          mctx.fillStyle = layer.shapeFill || '#3b82f6';
          if (layer.shapeType === 'ellipse') {
            mctx.beginPath();
            mctx.ellipse(layer.width / 2, layer.height / 2, layer.width / 2, layer.height / 2, 0, 0, Math.PI * 2);
            mctx.fill();
          } else {
            mctx.fillRect(0, 0, layer.width, layer.height);
          }
        } else if (layer.type === 'gradient' && layer.gradient) {
          const g = mctx.createLinearGradient(0, 0, layer.width, layer.height);
          layer.gradient.colors.forEach((c: any) => g.addColorStop(c.stop, c.color));
          mctx.fillStyle = g;
          mctx.fillRect(0, 0, layer.width, layer.height);
        }
        mctx.restore();
      }
      const mergedLayer: LayerData = {
        id: uid(),
        name: 'Merged',
        visible: true,
        locked: false,
        opacity: 100,
        blendMode: 'normal',
        canvas: merged,
        x: 0,
        y: 0,
        width: p.width,
        height: p.height,
        mask: null,
        maskEnabled: false,
        type: 'pixel',
        rotation: 0,
        scaleX: 1,
        scaleY: 1,
        flippedH: false,
        flippedV: false,
      };
      p.layers = [mergedLayer];
      p.activeLayerId = mergedLayer.id;
    }),

    selectLayerRelative: (delta) => set((state: any) => {
      const p = state.projects.find((p: any) => p.id === state.activeProjectId);
      if (!p) return;
      const idx = p.layers.findIndex((l: any) => l.id === p.activeLayerId);
      if (idx === -1) return;
      const next = Math.max(0, Math.min(p.layers.length - 1, idx + delta));
      p.activeLayerId = p.layers[next].id;
    }),

    addLayerMask: (layerId) => set((state: any) => {
      const p = state.projects.find((p: any) => p.id === state.activeProjectId);
      const layer = p?.layers.find((l: any) => l.id === layerId);
      if (!layer) return;
      const maskCanvas = createCanvas(layer.width, layer.height);
      const mctx = maskCanvas.getContext('2d')!;
      // White mask = fully visible
      mctx.fillStyle = '#ffffff';
      mctx.fillRect(0, 0, layer.width, layer.height);
      layer.mask = maskCanvas;
      layer.maskEnabled = true;
    }),

    setTool: (tool) => set((state: any) => {
      state.tool = { ...state.tool, ...tool };
    }),

    setToolId: (id) => set((state: any) => { state.tool.id = id; }),

    setSelection: (sel) => set((state: any) => {
      state.selection = sel;
      if (sel) state.lastSelection = sel;
    }),

    reselect: () => set((state: any) => {
      if (state.lastSelection) state.selection = state.lastSelection;
    }),

    fillSelection: (mode) => set((state: any) => {
      const p = state.projects.find((p: any) => p.id === state.activeProjectId);
      if (!p || !p.activeLayerId) return;
      const layer = p.layers.find((l: any) => l.id === p.activeLayerId);
      if (!layer?.canvas) return;
      const ctx = (layer.canvas as HTMLCanvasElement).getContext('2d');
      if (!ctx) return;
      const color = mode === 'foreground' ? state.tool.brushColor : '#ffffff';
      const sel = state.selection;
      ctx.save();
      if (sel) {
        ctx.beginPath();
        ctx.rect(sel.x, sel.y, sel.width, sel.height);
        ctx.clip();
        ctx.fillStyle = color;
        ctx.fillRect(sel.x, sel.y, sel.width, sel.height);
      } else {
        ctx.fillStyle = color;
        ctx.fillRect(0, 0, layer.width, layer.height);
      }
      ctx.restore();
    }),

    clearSelectionPixels: () => set((state: any) => {
      const p = state.projects.find((p: any) => p.id === state.activeProjectId);
      const sel = state.selection;
      if (!p || !sel) return;
      const layer = p.layers.find((l: any) => l.id === p.activeLayerId);
      if (!layer?.canvas) return;
      const ctx = (layer.canvas as HTMLCanvasElement).getContext('2d');
      if (!ctx) return;
      ctx.clearRect(sel.x, sel.y, sel.width, sel.height);
    }),

    pushHistory: (description) => set((state: any) => {
      const p = state.projects.find((p: any) => p.id === state.activeProjectId);
      if (!p) return;
      // Deep clone layers for history
      const snapshot = p.layers.map((l: any) => ({
        ...l,
        canvas: l.canvas ? (() => {
          const c = createCanvas(l.width, l.height);
          c.getContext('2d')!.drawImage(l.canvas as HTMLCanvasElement, 0, 0);
          return c;
        })() : null,
        mask: l.mask ? (() => {
          const c = createCanvas(l.width, l.height);
          c.getContext('2d')!.drawImage(l.mask as HTMLCanvasElement, 0, 0);
          return c;
        })() : null,
      }));
      // Truncate history after current index
      state.history = state.history.slice(0, state.historyIndex + 1);
      state.history.push({ layers: snapshot, description });
      state.historyIndex = state.history.length - 1;
      // Limit history to 50 entries
      if (state.history.length > 50) {
        state.history.shift();
        state.historyIndex--;
      }
    }),

    undo: () => set((state: any) => {
      if (state.historyIndex <= 0) return;
      state.historyIndex--;
      const p = state.projects.find((p: any) => p.id === state.activeProjectId);
      if (!p) return;
      const entry = state.history[state.historyIndex];
      p.layers = entry.layers.map((l: any) => ({ ...l }));
    }),

    redo: () => set((state: any) => {
      if (state.historyIndex >= state.history.length - 1) return;
      state.historyIndex++;
      const p = state.projects.find((p: any) => p.id === state.activeProjectId);
      if (!p) return;
      const entry = state.history[state.historyIndex];
      p.layers = entry.layers.map((l: any) => ({ ...l }));
    }),

    togglePanel: (panel) => set((state: any) => {
      state.panels[panel] = !state.panels[panel];
    }),

    toggleRulers: () => set((state: any) => { state.showRulers = !state.showRulers; }),

    toggleGrid: () => set((state: any) => { state.showGrid = !state.showGrid; }),

    toggleGuides: () => set((state: any) => { state.showGuides = !state.showGuides; }),

    setGridSize: (size) => set((state: any) => { state.gridSize = size; }),

    setZoom: (zoom) => set((state: any) => {
      const p = state.projects.find((p: any) => p.id === state.activeProjectId);
      if (p) p.zoom = zoom;
    }),

    setPan: (x, y) => set((state: any) => {
      const p = state.projects.find((p: any) => p.id === state.activeProjectId);
      if (p) { p.panX = x; p.panY = y; }
    }),

    fitToScreen: () => set((state: any) => {
      const p = state.projects.find((p: any) => p.id === state.activeProjectId);
      if (!p || !p.width || !p.height) return;
      const el = typeof document !== 'undefined' ? document.querySelector('.canvas-area') : null;
      const rect = el ? el.getBoundingClientRect() : null;
      const availW = (rect?.width ?? 800) - 48;
      const availH = (rect?.height ?? 600) - 48;
      if (availW <= 0 || availH <= 0) return;
      const z = Math.min(availW / p.width, availH / p.height);
      p.zoom = Math.max(0.05, Math.min(16, z));
      p.panX = 0;
      p.panY = 0;
    }),

    zoomIn: () => set((state: any) => {
      const p = state.projects.find((p: any) => p.id === state.activeProjectId);
      if (p) p.zoom = Math.min(16, p.zoom * 1.25);
    }),

    zoomOut: () => set((state: any) => {
      const p = state.projects.find((p: any) => p.id === state.activeProjectId);
      if (p) p.zoom = Math.max(0.05, p.zoom / 1.25);
    }),

    copyLayer: (id) => set((state: any) => {
      const p = state.projects.find((p: any) => p.id === state.activeProjectId);
      const layer = p?.layers.find((l: any) => l.id === id);
      if (layer) {
        state.clipboard = { ...layer, id: uid() };
      }
    }),

    pasteLayer: () => set((state: any) => {
      const p = state.projects.find((p: any) => p.id === state.activeProjectId);
      if (!p || !state.clipboard) return;
      const newCanvas = createCanvas(state.clipboard.width, state.clipboard.height);
      if (state.clipboard.canvas) {
        newCanvas.getContext('2d')!.drawImage(state.clipboard.canvas as HTMLCanvasElement, 0, 0);
      }
      const copy: LayerData = {
        ...state.clipboard,
        id: uid(),
        canvas: newCanvas,
        name: state.clipboard.name + ' copy',
      };
      const activeIdx = p.layers.findIndex((l: any) => l.id === p.activeLayerId);
      p.layers.splice(activeIdx + 1, 0, copy);
      p.activeLayerId = copy.id;
    }),

    toggleFullscreen: () => set((state: any) => { state.fullscreen = !state.fullscreen; }),
    toggleNavigator: () => set((state: any) => { state.showNavigator = !state.showNavigator; }),
    setDialog: (type) => set((state: any) => { state.dialog = { type }; }),
    setCommandPaletteOpen: (open) => set((state: any) => { state.commandPaletteOpen = open; }),
    setLanguage: (lang) => {
      try {
        localStorage.setItem(LANG_STORAGE_KEY, lang);
      } catch {
        // ignore
      }
      set((state: any) => { state.language = lang; });
    },

    beginTransform: () => set((state: any) => {
      const p = state.projects.find((p: any) => p.id === state.activeProjectId);
      if (!p || !p.activeLayerId) return;
      const layer = p.layers.find((l: any) => l.id === p.activeLayerId);
      if (!layer) return;
      state.transform = {
        active: true,
        handle: null,
        startX: 0, startY: 0,
        origX: layer.x, origY: layer.y,
        origW: layer.width, origH: layer.height,
        origRotation: layer.rotation || 0,
        origScaleX: layer.scaleX || 1,
        origScaleY: layer.scaleY || 1,
      };
    }),

    updateTransform: (handle, dx, dy) => set((state: any) => {
      if (!state.transform?.active) return;
      const p = state.projects.find((p: any) => p.id === state.activeProjectId);
      if (!p || !p.activeLayerId) return;
      const layer = p.layers.find((l: any) => l.id === p.activeLayerId);
      if (!layer) return;
      const t = state.transform;

      if (handle === 'move') {
        layer.x = t.origX + dx;
        layer.y = t.origY + dy;
      } else if (handle === 'rotate') {
        const cx = t.origX + t.origW / 2;
        const cy = t.origY + t.origH / 2;
        const angle = Math.atan2(dy, dx) * 180 / Math.PI;
        layer.rotation = Math.round(angle);
      } else {
        // Scale handles
        let newW = t.origW, newH = t.origH, newX = t.origX, newY = t.origY;
        if (handle.includes('e')) newW = Math.max(1, t.origW + dx);
        if (handle.includes('w')) { newW = Math.max(1, t.origW - dx); newX = t.origX + dx; }
        if (handle.includes('s')) newH = Math.max(1, t.origH + dy);
        if (handle.includes('n')) { newH = Math.max(1, t.origH - dy); newY = t.origY + dy; }
        layer.x = newX; layer.y = newY;
        layer.width = newW; layer.height = newH;
      }
    }),

    applyTransform: () => set((state: any) => { state.transform = null; }),
    cancelTransform: () => set((state: any) => { state.transform = null; }),

    flipLayer: (axis) => set((state: any) => {
      const p = state.projects.find((p: any) => p.id === state.activeProjectId);
      if (!p || !p.activeLayerId) return;
      const layer = p.layers.find((l: any) => l.id === p.activeLayerId);
      if (!layer?.canvas) return;
      const ctx = layer.canvas.getContext('2d')!;
      const w = layer.canvas.width, h = layer.canvas.height;
      const temp = createCanvas(w, h);
      const tctx = temp.getContext('2d')!;
      tctx.save();
      if (axis === 'horizontal') { tctx.translate(w, 0); tctx.scale(-1, 1); }
      else { tctx.translate(0, h); tctx.scale(1, -1); }
      tctx.drawImage(layer.canvas, 0, 0);
      tctx.restore();
      ctx.clearRect(0, 0, w, h);
      ctx.drawImage(temp, 0, 0);
    }),

    flipCanvas: (axis) => set((state: any) => {
      const p = state.projects.find((p: any) => p.id === state.activeProjectId);
      if (!p) return;
      for (const layer of p.layers) {
        if (!layer.canvas) continue;
        const ctx = layer.canvas.getContext('2d')!;
        const w = layer.canvas.width, h = layer.canvas.height;
        const temp = createCanvas(w, h);
        const tctx = temp.getContext('2d')!;
        tctx.save();
        if (axis === 'horizontal') { tctx.translate(w, 0); tctx.scale(-1, 1); }
        else { tctx.translate(0, h); tctx.scale(1, -1); }
        tctx.drawImage(layer.canvas, 0, 0);
        tctx.restore();
        ctx.clearRect(0, 0, w, h);
        ctx.drawImage(temp, 0, 0);
      }
    }),

    rotateLayer: (degrees) => set((state: any) => {
      const p = state.projects.find((p: any) => p.id === state.activeProjectId);
      if (!p || !p.activeLayerId) return;
      const layer = p.layers.find((l: any) => l.id === p.activeLayerId);
      if (!layer) return;
      layer.rotation = ((layer.rotation || 0) + degrees) % 360;
    }),

    beginCrop: () => set((state: any) => {
      const p = state.projects.find((p: any) => p.id === state.activeProjectId);
      if (!p) return;
      state.crop = {
        active: true,
        x: Math.round(p.width * 0.1),
        y: Math.round(p.height * 0.1),
        width: Math.round(p.width * 0.8),
        height: Math.round(p.height * 0.8),
        ratio: null,
      };
    }),

    setCropRatio: (ratio) => set((state: any) => {
      if (state.crop) state.crop.ratio = ratio;
    }),

    updateCrop: (patch) => set((state: any) => {
      if (state.crop) Object.assign(state.crop, patch);
    }),

    applyCrop: () => set((state: any) => {
      const p = state.projects.find((p: any) => p.id === state.activeProjectId);
      if (!p || !state.crop) return;
      const c = state.crop;
      // Resize all layers and canvas
      for (const layer of p.layers) {
        if (!layer.canvas) continue;
        const cropped = createCanvas(c.width, c.height);
        cropped.getContext('2d')!.drawImage(layer.canvas, c.x, c.y, c.width, c.height, 0, 0, c.width, c.height);
        layer.canvas = cropped;
        layer.x = Math.max(0, layer.x - c.x);
        layer.y = Math.max(0, layer.y - c.y);
        layer.width = c.width;
        layer.height = c.height;
      }
      p.width = c.width;
      p.height = c.height;
      state.crop = null;
    }),

    cancelCrop: () => set((state: any) => { state.crop = null; }),

    addGuide: (orientation, position) => set((state: any) => {
      const p = state.projects.find((p: any) => p.id === state.activeProjectId);
      if (!p) return;
      p.guides.push({ id: uid(), orientation, position });
    }),

    removeGuide: (id) => set((state: any) => {
      const p = state.projects.find((p: any) => p.id === state.activeProjectId);
      if (!p) return;
      p.guides = p.guides.filter((g: any) => g.id !== id);
    }),

    clearGuides: () => set((state: any) => {
      const p = state.projects.find((p: any) => p.id === state.activeProjectId);
      if (p) p.guides = [];
    }),

    setLayerEffect: (layerId, effect) => set((state: any) => {
      const p = state.projects.find((p: any) => p.id === state.activeProjectId);
      const layer = p?.layers.find((l: any) => l.id === layerId);
      if (!layer) return;
      layer.effects = { ...(layer.effects || {}), ...effect };
    }),

    setLayerRotation: (layerId, rotation) => set((state: any) => {
      const p = state.projects.find((p: any) => p.id === state.activeProjectId);
      const layer = p?.layers.find((l: any) => l.id === layerId);
      if (layer) layer.rotation = rotation;
    }),

    setLayerScale: (layerId, sx, sy) => set((state: any) => {
      const p = state.projects.find((p: any) => p.id === state.activeProjectId);
      const layer = p?.layers.find((l: any) => l.id === layerId);
      if (layer) { layer.scaleX = sx; layer.scaleY = sy; }
    }),

    updateLayer: (id, patch) => set((state: any) => {
      const p = state.projects.find((p: any) => p.id === state.activeProjectId);
      const layer = p?.layers.find((l: any) => l.id === id);
      if (layer) Object.assign(layer, patch);
    }),

    updateTextLayer: (id, patch) => set((state: any) => {
      const p = state.projects.find((p: any) => p.id === state.activeProjectId);
      const layer = p?.layers.find((l: any) => l.id === id);
      if (!layer || layer.type !== 'text') return;
      Object.assign(layer, patch);
      // Re-fit the bounding box to the (possibly new) text / font.
      const m = measureTextLayer(layer);
      layer.width = m.width;
      layer.height = m.height;
    }),

    nudgeLayer: (dx, dy) => set((state: any) => {
      const p = state.projects.find((p: any) => p.id === state.activeProjectId);
      if (!p || !p.activeLayerId) return;
      const layer = p.layers.find((l: any) => l.id === p.activeLayerId);
      if (layer) { layer.x += dx; layer.y += dy; }
    }),

    jumpHistory: (index) => set((state: any) => {
      const entry = state.history[index];
      if (!entry) return;
      state.historyIndex = index;
      const p = state.projects.find((p: any) => p.id === state.activeProjectId);
      if (p) p.layers = entry.layers.map((l: any) => ({ ...l }));
    }),

    resizeImage: (width, height) => set((state: any) => {
      const p = state.projects.find((p: any) => p.id === state.activeProjectId);
      if (!p) return;
      const oldW = p.width || 1;
      const oldH = p.height || 1;
      const sx = width / oldW;
      const sy = height / oldH;
      for (const layer of p.layers) {
        if (layer.canvas) {
          const scaled = createCanvas(width, height);
          scaled.getContext('2d')!.drawImage(layer.canvas as HTMLCanvasElement, 0, 0, oldW, oldH, 0, 0, width, height);
          layer.canvas = scaled;
        }
        layer.x = Math.round(layer.x * sx);
        layer.y = Math.round(layer.y * sy);
        layer.width = Math.max(1, Math.round(layer.width * sx));
        layer.height = Math.max(1, Math.round(layer.height * sy));
        if (layer.type === 'text' && layer.fontSize) {
          layer.fontSize = Math.max(1, Math.round(layer.fontSize * sy));
        }
      }
      p.width = width;
      p.height = height;
    }),

    openImage: (name, img) => set((state: any) => {
      const w = img.width;
      const h = img.height;
      const canvas = createCanvas(w, h);
      canvas.getContext('2d')!.drawImage(img, 0, 0);
      const layer: LayerData = {
        id: uid(),
        name: 'Background',
        visible: true,
        locked: false,
        opacity: 100,
        blendMode: 'normal',
        canvas,
        x: 0,
        y: 0,
        width: w,
        height: h,
        mask: null,
        maskEnabled: false,
        type: 'pixel',
        rotation: 0,
        scaleX: 1,
        scaleY: 1,
        flippedH: false,
        flippedV: false,
      };
      const project: ProjectState = {
        id: uid(),
        name,
        width: w,
        height: h,
        background: '#ffffff',
        layers: [layer],
        activeLayerId: layer.id,
        zoom: 1,
        panX: 0,
        panY: 0,
        guides: [],
      };
      state.projects.push(project);
      state.activeProjectId = project.id;
      state.history = [];
      state.historyIndex = -1;
    }),
  }))
);

// Selector helpers
export const useActiveProject = () =>
  useEditorStore((s) => s.projects.find((p) => p.id === s.activeProjectId));

export const useActiveLayer = () => {
  const project = useActiveProject();
  return project?.layers.find((l) => l.id === project.activeLayerId) || null;
};
