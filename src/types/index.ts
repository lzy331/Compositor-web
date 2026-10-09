// ===== Core Types =====

export type BlendMode =
  | 'normal' | 'multiply' | 'screen' | 'overlay' | 'darken' | 'lighten'
  | 'color-dodge' | 'color-burn' | 'hard-light' | 'soft-light' | 'difference'
  | 'exclusion' | 'hue' | 'saturation' | 'color' | 'luminosity' | 'linear-dodge'
  | 'linear-burn' | 'vivid-light' | 'linear-light' | 'pin-light' | 'hard-mix'
  | 'subtract' | 'divide';

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

export interface AppState {
  projects: ProjectState[];
  activeProjectId: string | null;
  tool: ToolState;
  selection: Selection | null;
  history: HistoryEntry[];
  historyIndex: number;
  clipboard: LayerData | null;
  showRulers: boolean;
  showGrid: boolean;
  gridSize: number;
  panels: {
    layers: boolean;
    properties: boolean;
    history: boolean;
  };
  keyboardShortcuts: Record<string, string>;
}
