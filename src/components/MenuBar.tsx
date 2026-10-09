import { useState, useRef, useEffect } from 'react';
import { useEditorStore } from '@/store/editorStore';
import { useT } from '@/i18n';
import { exportProject, openImageFile } from '@/utils/fileIO';
import type { Language } from '@/types';

type MenuItem = { labelKey?: string; shortcut?: string; action?: string; divider?: boolean };
const MENUS: { labelKey: string; items: MenuItem[] }[] = [
  {
    labelKey: 'menu.file',
    items: [
      { labelKey: 'menu.new', shortcut: 'Ctrl+N', action: 'new' },
      { labelKey: 'menu.open', shortcut: 'Ctrl+O', action: 'open' },
      { divider: true },
      { labelKey: 'menu.exportPng', shortcut: 'Ctrl+S', action: 'exportPng' },
      { labelKey: 'menu.exportJpeg', shortcut: 'Ctrl+Shift+S', action: 'exportJpeg' },
      { divider: true },
      { labelKey: 'sc.closeProject', shortcut: 'Ctrl+W', action: 'closeProject' },
    ],
  },
  {
    labelKey: 'menu.edit',
    items: [
      { labelKey: 'menu.undo', shortcut: 'Ctrl+Z', action: 'undo' },
      { labelKey: 'menu.redo', shortcut: 'Ctrl+Shift+Z', action: 'redo' },
      { divider: true },
      { labelKey: 'menu.copyLayer', shortcut: 'Ctrl+C', action: 'copy' },
      { labelKey: 'sc.cutLayer', shortcut: 'Ctrl+X', action: 'cut' },
      { labelKey: 'menu.pasteLayer', shortcut: 'Ctrl+V', action: 'paste' },
    ],
  },
  {
    labelKey: 'menu.layer',
    items: [
      { labelKey: 'menu.newLayer', shortcut: 'Ctrl+Shift+N', action: 'addLayer' },
      { labelKey: 'menu.duplicateLayer', shortcut: 'Ctrl+J', action: 'duplicate' },
      { labelKey: 'menu.deleteLayer', shortcut: 'Del', action: 'delete' },
      { divider: true },
      { labelKey: 'menu.mergeDown', shortcut: 'Ctrl+E', action: 'mergeDown' },
      { labelKey: 'sc.mergeVisible', shortcut: 'Ctrl+Shift+E', action: 'mergeVisible' },
      { labelKey: 'menu.addMask', action: 'addMask' },
      { divider: true },
      { labelKey: 'sc.bringForward', shortcut: 'Ctrl+]', action: 'bringForward' },
      { labelKey: 'sc.sendBackward', shortcut: 'Ctrl+[', action: 'sendBackward' },
      { labelKey: 'sc.bringFront', shortcut: 'Ctrl+Shift+]', action: 'bringFront' },
      { labelKey: 'sc.sendBack', shortcut: 'Ctrl+Shift+[', action: 'sendBack' },
      { divider: true },
      { labelKey: 'menu.flipH', action: 'flipH' },
      { labelKey: 'menu.flipV', action: 'flipV' },
      { labelKey: 'menu.rotateCW', action: 'rotateCW' },
      { labelKey: 'menu.rotateCCW', action: 'rotateCCW' },
      { divider: true },
      { labelKey: 'menu.fxShadow', action: 'fx-shadow' },
      { labelKey: 'menu.fxStroke', action: 'fx-stroke' },
      { labelKey: 'menu.fxOverlay', action: 'fx-overlay' },
    ],
  },
  {
    labelKey: 'menu.image',
    items: [
      { labelKey: 'menu.imageSize', shortcut: 'Ctrl+Alt+I', action: 'imageSize' },
      { labelKey: 'menu.canvasSize', shortcut: 'Ctrl+Alt+C', action: 'canvasSize' },
      { divider: true },
      { labelKey: 'menu.adjLevels', shortcut: 'Ctrl+L', action: 'dialog-levels' },
      { labelKey: 'menu.adjCurves', shortcut: 'Ctrl+M', action: 'dialog-curves' },
      { labelKey: 'menu.adjHsl', shortcut: 'Ctrl+U', action: 'dialog-hsl' },
      { labelKey: 'menu.adjInvert', shortcut: 'Ctrl+I', action: 'adjust-invert' },
      { labelKey: 'menu.adjBw', shortcut: 'Ctrl+Shift+U', action: 'adjust-bw' },
      { divider: true },
      { labelKey: 'menu.blurGaussian', action: 'filter-gaussian' },
      { labelKey: 'menu.blurMotion', action: 'filter-motion' },
      { labelKey: 'menu.noiseAdd', action: 'filter-noise' },
      { divider: true },
      { labelKey: 'menu.flipCanvasH', action: 'flipCanvasH' },
      { labelKey: 'menu.flipCanvasV', action: 'flipCanvasV' },
    ],
  },
  {
    labelKey: 'menu.select',
    items: [
      { labelKey: 'menu.selectAll', shortcut: 'Ctrl+A', action: 'selectAll' },
      { labelKey: 'menu.deselect', shortcut: 'Ctrl+D', action: 'deselect' },
      { labelKey: 'sc.reselect', shortcut: 'Ctrl+Shift+D', action: 'reselect' },
    ],
  },
  {
    labelKey: 'menu.view',
    items: [
      { labelKey: 'menu.zoomIn', shortcut: 'Ctrl++', action: 'zoomIn' },
      { labelKey: 'menu.zoomOut', shortcut: 'Ctrl+-', action: 'zoomOut' },
      { labelKey: 'sc.actualPixels', shortcut: 'Ctrl+1', action: 'actualPixels' },
      { labelKey: 'menu.fitScreen', shortcut: 'Ctrl+0', action: 'fitScreen' },
      { divider: true },
      { labelKey: 'menu.rulers', shortcut: 'Ctrl+R', action: 'toggleRulers' },
      { labelKey: 'menu.grid', shortcut: "Ctrl+'", action: 'toggleGrid' },
      { labelKey: 'sc.guides', shortcut: 'Ctrl+;', action: 'toggleGuides' },
      { labelKey: 'menu.navigator', action: 'toggleNavigator' },
      { divider: true },
      { labelKey: 'menu.fullscreen', shortcut: 'F', action: 'fullscreen' },
      { labelKey: 'menu.clearGuides', action: 'clearGuides' },
    ],
  },
  {
    labelKey: 'menu.help',
    items: [
      { labelKey: 'menu.shortcuts', shortcut: '?', action: 'shortcuts' },
      { labelKey: 'menu.about', action: 'about' },
    ],
  },
];

export default function MenuBar() {
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const store = useEditorStore();
  const t = useT();
  const language = useEditorStore((s) => s.language);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpenMenu(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleAction = (action: string) => {
    setOpenMenu(null);
    const s = useEditorStore.getState();
    const activeId = (() => {
      const p = s.projects.find(pr => pr.id === s.activeProjectId);
      return p?.activeLayerId ?? null;
    })();
    switch (action) {
      case 'new': s.setDialog('new'); break;
      case 'open': openImageFile(); break;
      case 'exportPng': exportProject('png'); break;
      case 'exportJpeg': exportProject('jpeg'); break;
      case 'closeProject': {
        const p = s.projects.find(pr => pr.id === s.activeProjectId);
        if (p) s.closeProject(p.id);
        break;
      }
      case 'undo': s.undo(); break;
      case 'redo': s.redo(); break;
      case 'copy': {
        if (activeId) s.copyLayer(activeId);
        break;
      }
      case 'cut': {
        if (activeId) { s.copyLayer(activeId); s.deleteLayer(activeId); }
        break;
      }
      case 'paste': s.pasteLayer(); break;
      case 'addLayer': s.addLayer('pixel'); break;
      case 'duplicate': {
        if (activeId) s.duplicateLayer(activeId);
        break;
      }
      case 'delete': {
        if (activeId) s.deleteLayer(activeId);
        break;
      }
      case 'mergeDown': s.mergeDown(); break;
      case 'mergeVisible': s.mergeVisible(); break;
      case 'bringForward': if (activeId) s.moveLayer(activeId, 'up'); break;
      case 'sendBackward': if (activeId) s.moveLayer(activeId, 'down'); break;
      case 'bringFront': if (activeId) s.moveLayer(activeId, 'top'); break;
      case 'sendBack': if (activeId) s.moveLayer(activeId, 'bottom'); break;
      case 'addMask': {
        if (activeId) s.addLayerMask(activeId);
        break;
      }
      case 'selectAll': {
        const p = s.projects.find(p => p.id === s.activeProjectId);
        if (p) s.setSelection({ x: 0, y: 0, width: p.width, height: p.height, type: 'rect' });
        break;
      }
      case 'deselect': s.setSelection(null); break;
      case 'reselect': s.reselect(); break;
      case 'actualPixels': s.setZoom(1); break;
      case 'toggleGuides': s.toggleGuides(); break;
      case 'zoomIn': {
        s.zoomIn();
        break;
      }
      case 'zoomOut': {
        s.zoomOut();
        break;
      }
      case 'fitScreen': s.fitToScreen(); break;
      case 'toggleRulers': s.toggleRulers(); break;
      case 'toggleGrid': s.toggleGrid(); break;
      case 'toggleNavigator': s.toggleNavigator(); break;
      case 'fullscreen': s.toggleFullscreen(); break;
      case 'clearGuides': s.clearGuides(); break;
      case 'imageSize': s.setDialog('imageSize'); break;
      case 'canvasSize': s.setDialog('canvasSize'); break;
      case 'dialog-levels': s.setDialog('levels'); break;
      case 'dialog-curves': s.setDialog('curves'); break;
      case 'dialog-hsl': s.setDialog('hsl'); break;
      case 'flipH': s.flipLayer('horizontal'); break;
      case 'flipV': s.flipLayer('vertical'); break;
      case 'flipCanvasH': s.flipCanvas('horizontal'); break;
      case 'flipCanvasV': s.flipCanvas('vertical'); break;
      case 'rotateCW': s.rotateLayer(90); break;
      case 'rotateCCW': s.rotateLayer(-90); break;
      case 'fx-shadow': {
        const p = s.projects.find(p => p.id === s.activeProjectId);
        if (p?.activeLayerId) s.setLayerEffect(p.activeLayerId, { dropShadow: { enabled: true, offsetX: 4, offsetY: 4, blur: 8, spread: 0, color: '#000000', opacity: 50 } });
        break;
      }
      case 'fx-stroke': {
        const p = s.projects.find(p => p.id === s.activeProjectId);
        if (p?.activeLayerId) s.setLayerEffect(p.activeLayerId, { stroke: { enabled: true, width: 3, color: '#000000', position: 'outside' } });
        break;
      }
      case 'fx-overlay': {
        const p = s.projects.find(p => p.id === s.activeProjectId);
        if (p?.activeLayerId) s.setLayerEffect(p.activeLayerId, { colorOverlay: { enabled: true, color: '#ff0000', opacity: 50 } });
        break;
      }
      case 'adjust-invert': {
        const p = s.projects.find(p => p.id === s.activeProjectId);
        if (!p || !p.activeLayerId) return;
        const layer = p.layers.find(l => l.id === p.activeLayerId);
        if (!layer?.canvas) return;
        const ctx = layer.canvas.getContext('2d')!;
        const imgData = ctx.getImageData(0, 0, layer.width, layer.height);
        import('@/engine/filters').then(({ applyAdjustment }) => {
          const result = applyAdjustment(imgData, { type: 'invert', params: {} });
          ctx.putImageData(result, 0, 0);
        });
        break;
      }
      case 'adjust-bw': {
        const p = s.projects.find(p => p.id === s.activeProjectId);
        if (!p || !p.activeLayerId) return;
        const layer = p.layers.find(l => l.id === p.activeLayerId);
        if (!layer?.canvas) return;
        const ctx = layer.canvas.getContext('2d')!;
        const imgData = ctx.getImageData(0, 0, layer.width, layer.height);
        import('@/engine/filters').then(({ applyAdjustment }) => {
          const result = applyAdjustment(imgData, { type: 'bw', params: {} });
          ctx.putImageData(result, 0, 0);
        });
        break;
      }
      case 'filter-gaussian': {
        const p = s.projects.find(p => p.id === s.activeProjectId);
        if (!p || !p.activeLayerId) return;
        const layer = p.layers.find(l => l.id === p.activeLayerId);
        if (!layer?.canvas) return;
        const ctx = layer.canvas.getContext('2d')!;
        const imgData = ctx.getImageData(0, 0, layer.width, layer.height);
        import('@/engine/filters').then(({ applyAdjustment }) => {
          const result = applyAdjustment(imgData, { type: 'gaussian-blur', params: { radius: 5 } });
          ctx.putImageData(result, 0, 0);
        });
        break;
      }
      case 'filter-noise': {
        const p = s.projects.find(p => p.id === s.activeProjectId);
        if (!p || !p.activeLayerId) return;
        const layer = p.layers.find(l => l.id === p.activeLayerId);
        if (!layer?.canvas) return;
        const ctx = layer.canvas.getContext('2d')!;
        const imgData = ctx.getImageData(0, 0, layer.width, layer.height);
        import('@/engine/filters').then(({ applyAdjustment }) => {
          const result = applyAdjustment(imgData, { type: 'noise', params: { amount: 15, monochrome: false } });
          ctx.putImageData(result, 0, 0);
        });
        break;
      }
      case 'shortcuts': {
        s.setDialog('shortcuts');
        break;
      }
      case 'about': {
        const lang = useEditorStore.getState().language;
        alert(lang === 'zh'
          ? 'Compositor Web v0.1.0\n一款受 macOS 版 Compositor 启发的网页图像编辑器。\n使用 React + TypeScript + Canvas 构建。'
          : 'Compositor Web v0.1.0\nA web-based image editor inspired by Compositor for macOS.\nBuilt with React + TypeScript + Canvas.');
        break;
      }
    }
  };

  return (
    <div className="menu-bar" ref={ref}>
      {MENUS.map((menu) => (
        <div key={menu.labelKey} style={{ position: 'relative' }}>
          <div
            className="menu-item"
            onClick={() => setOpenMenu(openMenu === menu.labelKey ? null : menu.labelKey)}
            style={openMenu === menu.labelKey ? { background: '#3a3a3a' } : {}}
          >
            {t(menu.labelKey)}
          </div>
          {openMenu === menu.labelKey && (
            <div className="menu-dropdown">
              {menu.items.map((item, i) =>
                item.divider ? (
                  <div key={i} className="menu-separator" />
                ) : (
                  <div key={i} className="menu-dropdown-item" onClick={() => handleAction(item.action!)}>
                    <span>{item.labelKey ? t(item.labelKey) : ''}</span>
                    {item.shortcut && <span className="shortcut">{item.shortcut}</span>}
                  </div>
                )
              )}
            </div>
          )}
        </div>
      ))}
      {/* Language switcher */}
      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 4, paddingRight: 4 }} title={t('lang.switch')}>
        {(['en', 'zh'] as Language[]).map((lang) => (
          <button
            key={lang}
            className="lang-btn"
            onClick={() => useEditorStore.getState().setLanguage(lang)}
            style={{
              background: language === lang ? '#3a5a8a' : 'transparent',
              color: language === lang ? '#fff' : '#aaa',
              border: '1px solid ' + (language === lang ? '#4a7aba' : '#3a3a3a'),
              borderRadius: 4,
              fontSize: 11,
              padding: '2px 8px',
              cursor: 'pointer',
            }}
          >
            {lang === 'en' ? 'EN' : '中文'}
          </button>
        ))}
      </div>
    </div>
  );
}
