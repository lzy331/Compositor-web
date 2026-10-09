import type { ProjectState, LayerData } from '@/types';
import { applyBlendMode } from './blendModes';
import { drawCheckerboard } from './colorUtils';

// Render all layers of a project onto the target canvas
export function renderProject(
  project: ProjectState,
  targetCtx: CanvasRenderingContext2D,
  targetWidth: number,
  targetHeight: number
): void {
  // Clear target
  targetCtx.clearRect(0, 0, targetWidth, targetHeight);

  // Draw checkerboard for transparency
  drawCheckerboard(targetCtx, targetWidth, targetHeight, 8);

  // Sort layers: bottom to top (store keeps them top-first in array? No, we store bottom-first)
  // Layers array: index 0 = bottom, last index = top
  for (const layer of project.layers) {
    if (!layer.visible) continue;
    renderLayer(layer, targetCtx);
  }
}

// Render a single layer onto the target context
export function renderLayer(layer: LayerData, ctx: CanvasRenderingContext2D): void {
  ctx.save();
  ctx.globalAlpha = layer.opacity / 100;
  applyBlendMode(ctx, layer.blendMode);

  if (layer.type === 'pixel' && layer.canvas) {
    if (layer.mask && layer.maskEnabled) {
      // Render with mask: use temporary canvas
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = layer.width;
      tempCanvas.height = layer.height;
      const tempCtx = tempCanvas.getContext('2d')!;
      tempCtx.drawImage(layer.canvas, 0, 0);
      // Apply mask
      tempCtx.globalCompositeOperation = 'destination-in';
      tempCtx.drawImage(layer.mask, 0, 0);
      ctx.drawImage(tempCanvas, layer.x, layer.y);
    } else {
      ctx.drawImage(layer.canvas, layer.x, layer.y);
    }
  } else if (layer.type === 'text') {
    renderTextLayer(layer, ctx);
  } else if (layer.type === 'shape') {
    renderShapeLayer(layer, ctx);
  } else if (layer.type === 'gradient') {
    renderGradientLayer(layer, ctx);
  } else if (layer.type === 'adjustment' && layer.adjustment) {
    // Adjustment layers are handled during compositing
    // For now, skip in individual render
  }

  ctx.restore();
}

function renderTextLayer(layer: LayerData, ctx: CanvasRenderingContext2D): void {
  if (!layer.text) return;
  ctx.save();
  ctx.font = `${layer.fontSize || 24}px ${layer.fontFamily || 'Arial'}`;
  ctx.fillStyle = layer.textColor || '#000000';
  ctx.textAlign = (layer.textAlign || 'left') as CanvasTextAlign;
  ctx.textBaseline = 'top';
  const lines = layer.text.split('\n');
  const lineHeight = (layer.fontSize || 24) * 1.2;
  let startX = layer.x;
  if (layer.textAlign === 'center') startX += layer.width / 2;
  else if (layer.textAlign === 'right') startX += layer.width;
  lines.forEach((line, i) => {
    ctx.fillText(line, startX, layer.y + i * lineHeight);
  });
  ctx.restore();
}

function renderShapeLayer(layer: LayerData, ctx: CanvasRenderingContext2D): void {
  ctx.save();
  ctx.beginPath();
  const x = layer.x, y = layer.y, w = layer.width, h = layer.height;
  switch (layer.shapeType) {
    case 'rect':
      ctx.rect(x, y, w, h);
      break;
    case 'rounded-rect': {
      const r = layer.borderRadius || 10;
      ctx.moveTo(x + r, y);
      ctx.arcTo(x + w, y, x + w, y + h, r);
      ctx.arcTo(x + w, y + h, x, y + h, r);
      ctx.arcTo(x, y + h, x, y, r);
      ctx.arcTo(x, y, x + w, y, r);
      ctx.closePath();
      break;
    }
    case 'ellipse':
      ctx.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
      break;
    case 'line':
      ctx.moveTo(x, y + h / 2);
      ctx.lineTo(x + w, y + h / 2);
      break;
  }
  if (layer.shapeFill && layer.shapeFill !== 'transparent') {
    ctx.fillStyle = layer.shapeFill;
    ctx.fill();
  }
  if (layer.shapeStrokeWidth && layer.shapeStrokeWidth > 0) {
    ctx.strokeStyle = layer.shapeStroke || '#000000';
    ctx.lineWidth = layer.shapeStrokeWidth;
    ctx.stroke();
  }
  ctx.restore();
}

function renderGradientLayer(layer: LayerData, ctx: CanvasRenderingContext2D): void {
  if (!layer.gradient) return;
  const grad = layer.gradient;
  let gradient: CanvasGradient;
  if (grad.type === 'linear') {
    const angle = (grad.angle * Math.PI) / 180;
    const cx = layer.x + layer.width / 2;
    const cy = layer.y + layer.height / 2;
    const len = Math.max(layer.width, layer.height);
    const x0 = cx - Math.cos(angle) * len / 2;
    const y0 = cy - Math.sin(angle) * len / 2;
    const x1 = cx + Math.cos(angle) * len / 2;
    const y1 = cy + Math.sin(angle) * len / 2;
    gradient = ctx.createLinearGradient(x0, y0, x1, y1);
  } else {
    const cx = layer.x + layer.width / 2;
    const cy = layer.y + layer.height / 2;
    gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(layer.width, layer.height) / 2);
  }
  grad.colors.forEach((c) => gradient.addColorStop(c.stop, c.color));
  ctx.fillStyle = gradient;
  ctx.fillRect(layer.x, layer.y, layer.width, layer.height);
}

// Render layer thumbnail for the layers panel
export function renderLayerThumbnail(layer: LayerData, size = 36): HTMLCanvasElement {
  const thumb = document.createElement('canvas');
  thumb.width = size;
  thumb.height = size;
  const ctx = thumb.getContext('2d')!;
  drawCheckerboard(ctx, size, size, 4);
  if (layer.canvas) {
    // Scale to fit
    const scale = Math.min(size / layer.width, size / layer.height);
    const w = layer.width * scale;
    const h = layer.height * scale;
    ctx.drawImage(layer.canvas, (size - w) / 2, (size - h) / 2, w, h);
  } else if (layer.type === 'text') {
    ctx.fillStyle = layer.textColor || '#000';
    ctx.font = '10px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('T', size / 2, size / 2 + 4);
  } else if (layer.type === 'shape') {
    ctx.fillStyle = layer.shapeFill || '#3b82f6';
    ctx.fillRect(4, 4, size - 8, size - 8);
  } else if (layer.type === 'gradient') {
    const g = ctx.createLinearGradient(0, 0, size, 0);
    layer.gradient?.colors.forEach(c => g.addColorStop(c.stop, c.color));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
  }
  return thumb;
}
