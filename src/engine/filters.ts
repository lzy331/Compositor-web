import type { AdjustmentSettings } from '@/types';

// Apply an adjustment to an ImageData
export function applyAdjustment(imageData: ImageData, settings: AdjustmentSettings): ImageData {
  const data = new Uint8ClampedArray(imageData.data);
  const w = imageData.width;
  const h = imageData.height;

  switch (settings.type) {
    case 'invert':
      for (let i = 0; i < data.length; i += 4) {
        data[i] = 255 - data[i];
        data[i + 1] = 255 - data[i + 1];
        data[i + 2] = 255 - data[i + 2];
      }
      break;

    case 'exposure': {
      const exposure = (settings.params.exposure as number) || 0;
      const gamma = (settings.params.gamma as number) || 1;
      const offset = (settings.params.offset as number) || 0;
      for (let i = 0; i < data.length; i += 4) {
        for (let c = 0; c < 3; c++) {
          let v = data[i + c] / 255;
          v = Math.pow(v * Math.pow(2, exposure) + offset, 1 / gamma);
          data[i + c] = Math.min(255, Math.max(0, v * 255));
        }
      }
      break;
    }

    case 'levels': {
      const inputBlack = (settings.params.inputBlack as number) || 0;
      const inputWhite = (settings.params.inputWhite as number) || 255;
      const gamma = (settings.params.gamma as number) || 1;
      const outputBlack = (settings.params.outputBlack as number) || 0;
      const outputWhite = (settings.params.outputWhite as number) || 255;
      for (let i = 0; i < data.length; i += 4) {
        for (let c = 0; c < 3; c++) {
          let v = data[i + c];
          v = ((v - inputBlack) / (inputWhite - inputBlack)) * 255;
          v = Math.pow(v / 255, 1 / gamma) * 255;
          v = (v / 255) * (outputWhite - outputBlack) + outputBlack;
          data[i + c] = Math.min(255, Math.max(0, v));
        }
      }
      break;
    }

    case 'hsl': {
      const hue = (settings.params.hue as number) || 0;
      const sat = (settings.params.saturation as number) || 0;
      const light = (settings.params.lightness as number) || 0;
      for (let i = 0; i < data.length; i += 4) {
        const { h: hOrig, s: sOrig, l: lOrig } = rgbToHslLocal(data[i], data[i + 1], data[i + 2]);
        let h = hOrig + hue;
        let s = sOrig * (1 + sat / 100);
        let l = lOrig * (1 + light / 100);
        h = ((h % 360) + 360) % 360;
        s = Math.min(100, Math.max(0, s));
        l = Math.min(100, Math.max(0, l));
        const rgb = hslToRgbLocal(h, s, l);
        data[i] = rgb.r;
        data[i + 1] = rgb.g;
        data[i + 2] = rgb.b;
      }
      break;
    }

    case 'bw': {
      for (let i = 0; i < data.length; i += 4) {
        const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
        data[i] = data[i + 1] = data[i + 2] = gray;
      }
      break;
    }

    case 'grain': {
      const amount = (settings.params.amount as number) || 10;
      for (let i = 0; i < data.length; i += 4) {
        const noise = (Math.random() - 0.5) * amount * 2.55;
        data[i] = Math.min(255, Math.max(0, data[i] + noise));
        data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + noise));
        data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + noise));
      }
      break;
    }

    case 'vignette': {
      const strength = (settings.params.strength as number) || 50;
      const cx = w / 2, cy = h / 2;
      const maxDist = Math.sqrt(cx * cx + cy * cy);
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const idx = (y * w + x) * 4;
          const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
          const factor = 1 - (dist / maxDist) * (strength / 100);
          data[idx] *= factor;
          data[idx + 1] *= factor;
          data[idx + 2] *= factor;
        }
      }
      break;
    }

    case 'noise': {
      const amount = (settings.params.amount as number) || 10;
      const monochrome = (settings.params.monochrome as unknown as boolean) ?? false;
      for (let i = 0; i < data.length; i += 4) {
        if (monochrome) {
          const n = (Math.random() - 0.5) * amount * 2.55;
          data[i] = Math.min(255, Math.max(0, data[i] + n));
          data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + n));
          data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + n));
        } else {
          for (let c = 0; c < 3; c++) {
            const n = (Math.random() - 0.5) * amount * 2.55;
            data[i + c] = Math.min(255, Math.max(0, data[i + c] + n));
          }
        }
      }
      break;
    }

    case 'gaussian-blur': {
      return applyGaussianBlur(imageData, settings.params.radius as number || 5);
    }

    case 'motion-blur': {
      return applyMotionBlur(imageData, settings.params.radius as number || 10, settings.params.angle as number || 0);
    }

    case 'color-balance': {
      const rShift = (settings.params.red as number) || 0;
      const gShift = (settings.params.green as number) || 0;
      const bShift = (settings.params.blue as number) || 0;
      for (let i = 0; i < data.length; i += 4) {
        data[i] = Math.min(255, Math.max(0, data[i] + rShift * 2.55));
        data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + gShift * 2.55));
        data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + bShift * 2.55));
      }
      break;
    }
  }

  return new ImageData(data, w, h);
}

function applyGaussianBlur(imageData: ImageData, radius: number): ImageData {
  const w = imageData.width;
  const h = imageData.height;
  const src = imageData.data;
  const dst = new Uint8ClampedArray(src.length);
  const boxSize = Math.max(1, Math.floor(radius));
  const box = [];
  for (let i = -boxSize; i <= boxSize; i++) box.push(i);

  // Horizontal pass
  const temp = new Uint8ClampedArray(src.length);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let r = 0, g = 0, b = 0, a = 0, count = 0;
      for (const dx of box) {
        const px = Math.min(w - 1, Math.max(0, x + dx));
        const idx = (y * w + px) * 4;
        r += src[idx]; g += src[idx + 1]; b += src[idx + 2]; a += src[idx + 3];
        count++;
      }
      const idx = (y * w + x) * 4;
      temp[idx] = r / count; temp[idx + 1] = g / count;
      temp[idx + 2] = b / count; temp[idx + 3] = a / count;
    }
  }
  // Vertical pass
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let r = 0, g = 0, b = 0, a = 0, count = 0;
      for (const dy of box) {
        const py = Math.min(h - 1, Math.max(0, y + dy));
        const idx = (py * w + x) * 4;
        r += temp[idx]; g += temp[idx + 1]; b += temp[idx + 2]; a += temp[idx + 3];
        count++;
      }
      const idx = (y * w + x) * 4;
      dst[idx] = r / count; dst[idx + 1] = g / count;
      dst[idx + 2] = b / count; dst[idx + 3] = a / count;
    }
  }
  return new ImageData(dst, w, h);
}

function applyMotionBlur(imageData: ImageData, radius: number, angle: number): ImageData {
  const w = imageData.width;
  const h = imageData.height;
  const src = imageData.data;
  const dst = new Uint8ClampedArray(src.length);
  const rad = (angle * Math.PI) / 180;
  const dx = Math.cos(rad);
  const dy = Math.sin(rad);
  const steps = Math.max(1, Math.floor(radius));

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let r = 0, g = 0, b = 0, a = 0, count = 0;
      for (let s = -steps; s <= steps; s++) {
        const px = Math.min(w - 1, Math.max(0, Math.round(x + dx * s)));
        const py = Math.min(h - 1, Math.max(0, Math.round(y + dy * s)));
        const idx = (py * w + px) * 4;
        r += src[idx]; g += src[idx + 1]; b += src[idx + 2]; a += src[idx + 3];
        count++;
      }
      const idx = (y * w + x) * 4;
      dst[idx] = r / count; dst[idx + 1] = g / count;
      dst[idx + 2] = b / count; dst[idx + 3] = a / count;
    }
  }
  return new ImageData(dst, w, h);
}

// Local helper functions to avoid circular imports
function rgbToHslLocal(r: number, g: number, b: number): { h: number; s: number; l: number } {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  return { h: h * 360, s: s * 100, l: l * 100 };
}

function hslToRgbLocal(h: number, s: number, l: number): { r: number; g: number; b: number } {
  h /= 360; s /= 100; l /= 100;
  let r, g, b;
  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }
  return { r: Math.round(r * 255), g: Math.round(g * 255), b: Math.round(b * 255) };
}

// Magic wand: create a selection mask of connected same-color pixels
export function magicWandSelect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number,
  tolerance = 32,
  contiguous = true
): { x: number; y: number; width: number; height: number; mask: ImageData } | null {
  const canvas = ctx.canvas;
  const w = canvas.width;
  const h = canvas.height;
  const imgData = ctx.getImageData(0, 0, w, h);
  const data = imgData.data;
  const startIdx = (y * w + x) * 4;
  const sr = data[startIdx], sg = data[startIdx + 1], sb = data[startIdx + 2], sa = data[startIdx + 3];
  if (sa === 0) return null;

  const mask = new Uint8ClampedArray(w * h);
  let minX = w, minY = h, maxX = 0, maxY = 0;

  const match = (idx: number) =>
    Math.abs(data[idx] - sr) <= tolerance &&
    Math.abs(data[idx + 1] - sg) <= tolerance &&
    Math.abs(data[idx + 2] - sb) <= tolerance &&
    data[idx + 3] > 10;

  if (contiguous) {
    const stack: [number, number][] = [[x, y]];
    while (stack.length) {
      const [cx, cy] = stack.pop()!;
      if (cx < 0 || cx >= w || cy < 0 || cy >= h) continue;
      const mi = cy * w + cx;
      if (mask[mi]) continue;
      if (!match(mi * 4)) continue;
      mask[mi] = 255;
      if (cx < minX) minX = cx; if (cx > maxX) maxX = cx;
      if (cy < minY) minY = cy; if (cy > maxY) maxY = cy;
      stack.push([cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1]);
    }
  } else {
    for (let py = 0; py < h; py++) {
      for (let px = 0; px < w; px++) {
        if (match((py * w + px) * 4)) {
          mask[py * w + px] = 255;
          if (px < minX) minX = px; if (px > maxX) maxX = px;
          if (py < minY) minY = py; if (py > maxY) maxY = py;
        }
      }
    }
  }

  if (maxX < minX) return null;
  const selW = maxX - minX + 1;
  const selH = maxY - minY + 1;
  const maskData = new ImageData(selW, selH);
  for (let py = 0; py < selH; py++) {
    for (let px = 0; px < selW; px++) {
      const srcIdx = ((minY + py) * w + (minX + px));
      const dstIdx = (py * selW + px) * 4;
      const v = mask[srcIdx];
      maskData.data[dstIdx] = v;
      maskData.data[dstIdx + 1] = v;
      maskData.data[dstIdx + 2] = v;
      maskData.data[dstIdx + 3] = v;
    }
  }
  return { x: minX, y: minY, width: selW, height: selH, mask: maskData };
}

// Feather a selection mask by radius pixels
export function featherMask(mask: ImageData, radius: number): ImageData {
  if (radius <= 0) return mask;
  const w = mask.width, h = mask.height;
  const result = new ImageData(new Uint8ClampedArray(mask.data), w, h);
  const box = Math.max(1, Math.floor(radius));
  const temp = new Uint8ClampedArray(result.data.length);

  // Horizontal pass
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let sum = 0, count = 0;
      for (let dx = -box; dx <= box; dx++) {
        const px = Math.min(w - 1, Math.max(0, x + dx));
        sum += result.data[(y * w + px) * 4];
        count++;
      }
      temp[(y * w + x) * 4] = sum / count;
    }
  }
  // Vertical pass
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let sum = 0, count = 0;
      for (let dy = -box; dy <= box; dy++) {
        const py = Math.min(h - 1, Math.max(0, y + dy));
        sum += temp[(py * w + x) * 4];
        count++;
      }
      const idx = (y * w + x) * 4;
      result.data[idx] = result.data[idx + 1] = result.data[idx + 2] = result.data[idx + 3] = sum / count;
    }
  }
  return result;
}

// Flood fill for paint bucket tool
export function floodFill(
  ctx: CanvasRenderingContext2D,
  x: number, y: number,
  fillColor: { r: number; g: number; b: number; a: number },
  tolerance = 32
): void {
  const canvas = ctx.canvas;
  const w = canvas.width;
  const h = canvas.height;
  const imgData = ctx.getImageData(0, 0, w, h);
  const data = imgData.data;
  const startIdx = (y * w + x) * 4;
  const startR = data[startIdx], startG = data[startIdx + 1], startB = data[startIdx + 2], startA = data[startIdx + 3];

  if (startA === 0 && fillColor.a === 0) return;

  const matches = (idx: number) => {
    const dr = Math.abs(data[idx] - startR);
    const dg = Math.abs(data[idx + 1] - startG);
    const db = Math.abs(data[idx + 2] - startB);
    const da = Math.abs(data[idx + 3] - startA);
    return dr <= tolerance && dg <= tolerance && db <= tolerance && da <= tolerance;
  };

  const stack: [number, number][] = [[x, y]];
  const visited = new Uint8Array(w * h);

  while (stack.length > 0) {
    const [cx, cy] = stack.pop()!;
    if (cx < 0 || cx >= w || cy < 0 || cy >= h) continue;
    const vIdx = cy * w + cx;
    if (visited[vIdx]) continue;
    visited[vIdx] = 1;
    const idx = vIdx * 4;
    if (!matches(idx)) continue;
    data[idx] = fillColor.r;
    data[idx + 1] = fillColor.g;
    data[idx + 2] = fillColor.b;
    data[idx + 3] = fillColor.a;
    stack.push([cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1]);
  }
  ctx.putImageData(imgData, 0, 0);
}
