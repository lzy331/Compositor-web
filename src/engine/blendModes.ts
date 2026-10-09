import type { BlendMode } from '@/types';

// Apply blend mode to a context
export function applyBlendMode(ctx: CanvasRenderingContext2D, mode: BlendMode): void {
  const modeMap: Record<BlendMode, GlobalCompositeOperation> = {
    'normal': 'source-over',
    'multiply': 'multiply',
    'screen': 'screen',
    'overlay': 'overlay',
    'darken': 'darken',
    'lighten': 'lighten',
    'color-dodge': 'color-dodge',
    'color-burn': 'color-burn',
    'hard-light': 'hard-light',
    'soft-light': 'soft-light',
    'difference': 'difference',
    'exclusion': 'exclusion',
    'hue': 'hue',
    'saturation': 'saturation',
    'color': 'color',
    'luminosity': 'luminosity',
    'linear-dodge': 'lighter',
    'linear-burn': 'color-burn',
    'vivid-light': 'overlay',
    'linear-light': 'overlay',
    'pin-light': 'overlay',
    'hard-mix': 'overlay',
    'subtract': 'difference',
    'divide': 'screen',
  };
  ctx.globalCompositeOperation = modeMap[mode] || 'source-over';
}

export const BLEND_MODES: BlendMode[] = [
  'normal', 'multiply', 'screen', 'overlay', 'darken', 'lighten',
  'color-dodge', 'color-burn', 'hard-light', 'soft-light', 'difference',
  'exclusion', 'hue', 'saturation', 'color', 'luminosity', 'linear-dodge',
  'linear-burn', 'vivid-light', 'linear-light', 'pin-light', 'hard-mix',
  'subtract', 'divide',
];
