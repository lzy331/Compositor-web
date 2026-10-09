import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type {
  AppState, ProjectState, LayerData, ToolId, ToolState, Selection, BlendMode,
} from '@/types';
import { uid, createCanvas } from '@/engine/colorUtils';

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
  addLayerMask: (layerId: string) => void;

  // Tool management
  setTool: (tool: Partial<ToolState>) => void;
  setToolId: (id: ToolId) => void;

  // Selection
  setSelection: (sel: Selection | null) => void;

  // History
  pushHistory: (description: string) => void;
  undo: () => void;
  redo: () => void;

  // UI
  togglePanel: (panel: 'layers' | 'properties' | 'history') => void;
  toggleRulers: () => void;
  toggleGrid: () => void;
  setGridSize: (size: number) => void;

  // Canvas
  setZoom: (zoom: number) => void;
  setPan: (x: number, y: number) => void;

  // Clipboard
  copyLayer: (id: string) => void;
  pasteLayer: () => void;
}

export const useEditorStore = create<AppState & StoreActions>()(
  immer((set, get) => ({
    projects: [createDefaultProject()],
    activeProjectId: null,
    tool: defaultToolState(),
    selection: null,
    history: [],
    historyIndex: -1,
    clipboard: null,
    showRulers: true,
    showGrid: false,
    gridSize: 50,
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
      };
      if (type === 'text') {
        layer.text = 'Text';
        layer.fontSize = 24;
        layer.fontFamily = 'Arial';
        layer.textColor = '#000000';
        layer.textAlign = 'left';
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

    setSelection: (sel) => set((state: any) => { state.selection = sel; }),

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

    setGridSize: (size) => set((state: any) => { state.gridSize = size; }),

    setZoom: (zoom) => set((state: any) => {
      const p = state.projects.find((p: any) => p.id === state.activeProjectId);
      if (p) p.zoom = zoom;
    }),

    setPan: (x, y) => set((state: any) => {
      const p = state.projects.find((p: any) => p.id === state.activeProjectId);
      if (p) { p.panX = x; p.panY = y; }
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
  }))
);

// Selector helpers
export const useActiveProject = () =>
  useEditorStore((s) => s.projects.find((p) => p.id === s.activeProjectId));

export const useActiveLayer = () => {
  const project = useActiveProject();
  return project?.layers.find((l) => l.id === project.activeLayerId) || null;
};
