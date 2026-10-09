import { useRef, useEffect, useState } from 'react';
import { useEditorStore } from '@/store/editorStore';
import { useT } from '@/i18n';
import { renderProject } from '@/engine/renderer';

const MINI_W = 120;
const MINI_H = 90;

export default function Navigator() {
  const showNavigator = useEditorStore((s) => s.showNavigator);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [, force] = useState(0);
  const t = useT();

  // Re-render on relevant store changes
  const projects = useEditorStore((s) => s.projects);
  const activeProjectId = useEditorStore((s) => s.activeProjectId);

  useEffect(() => {
    if (!showNavigator) return;
    const interval = setInterval(() => force((n) => n + 1), 500);
    return () => clearInterval(interval);
  }, [showNavigator]);

  useEffect(() => {
    if (!showNavigator) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const s = useEditorStore.getState();
    const project = s.projects.find((p) => p.id === s.activeProjectId);
    if (!project) return;

    // Render project into an offscreen canvas at native size, then scale down
    const off = document.createElement('canvas');
    off.width = project.width;
    off.height = project.height;
    const offCtx = off.getContext('2d');
    if (!offCtx) return;
    renderProject(project, offCtx, project.width, project.height);

    ctx.clearRect(0, 0, MINI_W, MINI_H);
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, MINI_W, MINI_H);

    const scale = Math.min(MINI_W / project.width, MINI_H / project.height);
    const dw = project.width * scale;
    const dh = project.height * scale;
    const dx = (MINI_W - dw) / 2;
    const dy = (MINI_H - dh) / 2;
    ctx.drawImage(off, dx, dy, dw, dh);

    // Viewport rectangle indicator
    const area = document.querySelector('.canvas-area');
    const areaRect = area?.getBoundingClientRect();
    const viewW = areaRect ? areaRect.width : 800;
    const viewH = areaRect ? areaRect.height : 600;

    // Visible document region (approx): canvas is centered, scaled by zoom, panned
    const dispW = project.width * project.zoom;
    const dispH = project.height * project.zoom;
    const offsetX = (viewW - dispW) / 2 + project.panX;
    const offsetY = (viewH - dispH) / 2 + project.panY;

    // Document coords of viewport corners
    const docX0 = (-offsetX) / project.zoom;
    const docY0 = (-offsetY) / project.zoom;
    const docX1 = (viewW - offsetX) / project.zoom;
    const docY1 = (viewH - offsetY) / project.zoom;

    const vx = dx + docX0 * scale;
    const vy = dy + docY0 * scale;
    const vw = (docX1 - docX0) * scale;
    const vh = (docY1 - docY0) * scale;

    ctx.strokeStyle = '#3a8ee6';
    ctx.lineWidth = 1;
    ctx.strokeRect(
      Math.max(dx, Math.min(dx + dw, vx)),
      Math.max(dy, Math.min(dy + dh, vy)),
      Math.min(dw, Math.max(1, vw)),
      Math.min(dh, Math.max(1, vh))
    );
  }, [showNavigator, projects, activeProjectId, force]);

  if (!showNavigator) return null;

  return (
    <div
      style={{
        position: 'absolute',
        top: 8,
        right: 8,
        width: MINI_W + 8,
        background: '#252525',
        border: '1px solid #444',
        borderRadius: 6,
        padding: 4,
        zIndex: 10,
        boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
      }}
    >
      <div style={{ fontSize: 9, color: '#888', marginBottom: 3, textAlign: 'center', textTransform: 'uppercase', letterSpacing: 0.5 }}>
        {t('panel.navigator')}
      </div>
      <canvas
        ref={canvasRef}
        width={MINI_W}
        height={MINI_H}
        style={{ display: 'block', width: MINI_W, height: MINI_H, borderRadius: 3 }}
      />
    </div>
  );
}
