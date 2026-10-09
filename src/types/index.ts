// ===== Core Types =====

export type Language = 'en' | 'zh';

export type BlendMode =
  | 'normal' | 'multiply' | 'screen' | 'overlay' | 'darken' | 'lighten'
  | 'color-dodge' | 'color-burn' | 'hard-light' | 'soft-light' | 'difference'
  | 'exclusion' | 'hue' | 'saturation' | 'color' | 'luminosity' | 'linear-dodge'
  | 'linear-burn' | 'vivid-light' | 'linear-light' | 'pin-light' | 'hard-mix'
  | 'subtract' | 'divide';

export interface LayerEffects {
  dropShadow?: {
    enabled: boolean;
    offsetX: number;
    offsetY: number;
    blur: number;
    spread: number;
    color: string;
    opacity: number;
  };
  stroke?: {
    enabled: boolean;
    width: number;
    color: string;
    position: 'outside' | 'inside' | 'center';
  };
  colorOverlay?: {
    enabled: boolean;
    color: string;
    opacity: number;
  };
}

export interface LayerData {
  id: string;
  name: string;
  visible: boolean;
  locked: boolean;
  opacity: number; // 0-100
  blendMode: BlendMode;
  canvas: HTMLCanvasElement | null; // pixel data
  x: number;
  y: number;
  width: number;
  height: number;
  mask: HTMLCanvasElement | null;
  maskEnabled: boolean;
  type: 'pixel' | 'text' | 'shape' | 'adjustment' | 'gradient';
  rotation: number; // degrees
  scaleX: number;
  scaleY: number;
  flippedH: boolean;
  flippedV: boolean;
  effects?: LayerEffects;
  // For text layers
  text?: string;
  fontSize?: number;
  fontFamily?: string;
  textColor?: string;
  textAlign?: 'left' | 'center' | 'right';
  // For shape layers
  shapeType?: 'rect' | 'ellipse' | 'line' | 'rounded-rect';
  shapeFill?: string;
  shapeStroke?: string;
  shapeStrokeWidth?: number;
  borderRadius?: number;
  // For adjustment layers
  adjustment?: AdjustmentSettings;
  // For gradient layers
  gradient?: GradientSettings;
}

export interface AdjustmentSettings {
  type: 'levels' | 'curves' | 'hsl' | 'exposure' | 'invert' | 'grain' | 'bw'
    | 'color-balance' | 'gradient-map' | 'gaussian-blur' | 'motion-blur' | 'noise' | 'vignette';
  params: Record<string, any>;
}

export interface GradientSettings {
  type: 'linear' | 'radial' | 'angle' | 'reflected' | 'diamond';
  colors: { stop: number; color: string }[];
  angle: number;
  scale: number;
}

export interface Guide {
  id: string;
  orientation: 'horizontal' | 'vertical';
  position: number; // in document pixels
}

export interface TransformState {
  active: boolean;
  handle: string | null; // 'nw','n','ne','e','se','s','sw','w','rotate','move'
  startX: number;
  startY: number;
  origX: number;
  origY: number;
  origW: number;
  origH: number;
  origRotation: number;
  origScaleX: number;
  origScaleY: number;
}

export interface CropState {
  active: boolean;
  x: number;
  y: number;
  width: number;
  height: number;
  ratio: string | null; // 'free','1:1','3:4','4:3','9:16','16:9'
}

export interface ProjectState {
  id: string;
  name: string;
  width: number;
  height: number;
  background: string;
  layers: LayerData[];
  activeLayerId: string | null;
  zoom: number;
  panX: number;
  panY: number;
  guides: Guide[];
}

export interface DialogState {
  type: 'levels' | 'curves' | 'hsl' | 'imageSize' | 'canvasSize' | 'new' | 'shortcuts' | null;
}

export interface AppState {
  projects: ProjectState[];
  activeProjectId: string | null;
  tool: ToolState;
  selection: Selection | null;
  lastSelection: Selection | null;
  history: HistoryEntry[];
  historyIndex: number;
  clipboard: LayerData | null;
  showRulers: boolean;
  showGrid: boolean;
  showGuides: boolean;
  gridSize: number;
  fullscreen: boolean;
  showNavigator: boolean;
  transform: TransformState | null;
  crop: CropState | null;
  dialog: DialogState;
  commandPaletteOpen: boolean;
  language: Language;
  panels: {
    layers: boolean;
    properties: boolean;
    history: boolean;
  };
  keyboardShortcuts: Record<string, string>;
}

export interface Selection {
  x: number;
  y: number;
  width: number;
  height: number;
  type: 'rect' | 'ellipse' | 'freehand' | 'polygon' | 'magic';
  points?: { x: number; y: number }[];
  mask?: ImageData | null;
}

export type ToolId =
  | 'move' | 'marquee' | 'lasso' | 'magic' | 'brush' | 'eraser'
  | 'fill' | 'gradient' | 'eyedropper' | 'shape' | 'text'
  | 'clone' | 'blur' | 'hand' | 'zoom' | 'crop';

export interface ToolState {
  id: ToolId;
  brushSize: number;
  brushHardness: number;
  brushOpacity: number;
  brushFlow: number;
  brushColor: string;
  shapeType: 'rect' | 'ellipse' | 'line' | 'rounded-rect';
  shapeFill: string;
  shapeStroke: string;
  shapeStrokeWidth: number;
  fontSize: number;
  fontFamily: string;
  textAlign: 'left' | 'center' | 'right';
  gradientType: 'linear' | 'radial';
}

export interface HistoryEntry {
  layers: LayerData[];
  description: string;
}
