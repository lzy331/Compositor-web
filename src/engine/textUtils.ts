import type { LayerData } from '@/types';

// Measure the natural bounding box of a text layer's content so its
// transform box hugs the text instead of the whole canvas.
export function measureTextLayer(layer: Pick<LayerData, 'text' | 'fontSize' | 'fontFamily'>): { width: number; height: number } {
  const fontSize = layer.fontSize || 24;
  const fontFamily = layer.fontFamily || 'Arial';
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  const lines = (layer.text ?? '').split('\n');
  let maxW = fontSize; // fallback minimum
  if (ctx) {
    ctx.font = `${fontSize}px ${fontFamily}`;
    for (const line of lines) {
      maxW = Math.max(maxW, ctx.measureText(line).width);
    }
  }
  const lineHeight = fontSize * 1.2;
  return {
    width: Math.max(16, Math.ceil(maxW) + 8),
    height: Math.max(Math.ceil(lineHeight), Math.ceil(lines.length * lineHeight)),
  };
}