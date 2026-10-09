import { useState, useRef, useEffect } from 'react';
import { useEditorStore } from '@/store/editorStore';
import { useT } from '@/i18n';
import type { Language } from '@/types';

type MenuItem = { labelKey?: string; shortcut?: string; action?: string; divider?: boolean };
const MENUS: { labelKey: string; items: MenuItem[] }[] = [
  {
    labelKey: 'menu.file',
    items: [
      { labelKey: 'menu.new', shortcut: 'Ctrl+N', action: 'new' },
      { labelKey: 'menu.open', shortcut: 'Ctrl+O', action: 'open' },
      { divider: true },
      { labelKey: 'menu.exportPng', shortcut: 'Ctrl+E', action: 'exportPng' },
      { labelKey: 'menu.exportJpeg', shortcut: 'Ctrl+Shift+E', action: 'exportJpeg' },
    ],
  },
  {
    labelKey: 'menu.edit',
    items: [
      { labelKey: 'menu.undo', shortcut: 'Ctrl+Z', action: 'undo' },
      { labelKey: 'menu.redo', shortcut: 'Ctrl+Shift+Z', action: 'redo' },
      { divider: true },
      { labelKey: 'menu.copyLayer', shortcut: 'Ctrl+C', action: 'copy' },
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
      { labelKey: 'menu.addMask', action: 'addMask' },
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
      { labelKey: 'menu.imageSize', action: 'imageSize' },
      { labelKey: 'menu.canvasSize', action: 'canvasSize' },
      { divider: true },
      { labelKey: 'menu.adjLevels', action: 'dialog-levels' },
      { labelKey: 'menu.adjCurves', action: 'dialog-curves' },
      { labelKey: 'menu.adjHsl', action: 'dialog-hsl' },
      { labelKey: 'menu.adjInvert', action: 'adjust-invert' },
      { labelKey: 'menu.adjBw', action: 'adjust-bw' },
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
    ],
  },
  {
    labelKey: 'menu.view',
    items: [
      { labelKey: 'menu.zoomIn', shortcut: 'Ctrl++', action: 'zoomIn' },
      { labelKey: 'menu.zoomOut', shortcut: 'Ctrl+-', action: 'zoomOut' },
      { labelKey: 'menu.fitScreen', shortcut: 'Ctrl+0', action: 'fitScreen' },
      { divider: true },
      { labelKey: 'menu.rulers', shortcut: 'Ctrl+R', action: 'toggleRulers' },
      { labelKey: 'menu.grid', action: 'toggleGrid' },
      { labelKey: 'menu.navigator', action: 'toggleNavigator' },
      { labelKey: 'menu.fullscreen', shortcut: 'F', action: 'fullscreen' },
      { divider: true },
      { labelKey: 'menu.clearGuides', action: 'clearGuides' },
    ],
  },
  {
    labelKey: 'menu.help',
    items: [
      { labelKey: 'menu.shortcuts', action: 'shortcuts' },
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
    switch (action) {
      case 'new': s.setDialog('new'); break;
      case 'open': handleOpenFile(); break;
      case 'exportPng': handleExport('png'); break;
      case 'exportJpeg': handleExport('jpeg'); break;
      case 'undo': s.undo(); break;
      case 'redo': s.redo(); break;
      case 'copy': {
        const p = s.projects.find(p => p.id === s.activeProjectId);
        if (p?.activeLayerId) s.copyLayer(p.activeLayerId);
        break;
      }
      case 'paste': s.pasteLayer(); break;
      case 'addLayer': s.addLayer('pixel'); break;
      case 'duplicate': {
        const p = s.projects.find(p => p.id === s.activeProjectId);
        if (p?.activeLayerId) s.duplicateLayer(p.activeLayerId);
        break;
      }
      case 'delete': {
        const p = s.projects.find(p => p.id === s.activeProjectId);
        if (p?.activeLayerId) s.deleteLayer(p.activeLayerId);
        break;
      }
      case 'mergeDown': s.mergeDown(); break;
      case 'addMask': {
        const p = s.projects.find(p => p.id === s.activeProjectId);
        if (p?.activeLayerId) s.addLayerMask(p.activeLayerId);
        break;
      }
      case 'selectAll': {
        const p = s.projects.find(p => p.id === s.activeProjectId);
        if (p) s.setSelection({ x: 0, y: 0, width: p.width, height: p.height, type: 'rect' });
        break;
      }
      case 'deselect': s.setSelection(null); break;
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
      case 'about': {
        const lang = useEditorStore.getState().language;
        alert(lang === 'zh'
          ? 'Compositor Web v0.1.0\n一款受 macOS 版 Compositor 启发的网页图像编辑器。\n使用 React + TypeScript + Canvas 构建。'
          : 'Compositor Web v0.1.0\nA web-based image editor inspired by Compositor for macOS.\nBuilt with React + TypeScript + Canvas.');
        break;
      }
      case 'shortcuts': {
        const lang = useEditorStore.getState().language;
        alert(lang === 'zh'
          ? '快捷键：\nV 移动  M 选框  L 套索  W 魔棒  C 裁剪  I 吸管\nB 画笔  E 橡皮  G 填充  U 形状  T 文字  S 仿制图章\nR 模糊  H 抓手  Z 缩放\n[ ] 调整画笔大小\n方向键 微调位置（Shift 10px）  空格 拖动画布\nCtrl+Z 撤销  Ctrl+Shift+Z 重做\nCtrl+A 全选  Ctrl+D 取消选择  Ctrl+J 复制图层\nCtrl+F 命令面板  Ctrl+T 变换  F 全屏\nCtrl+0 适合屏幕  Ctrl+加号/减号 缩放\n回车 应用变换/裁剪  Esc 取消'
          : 'Shortcuts:\nV Move  M Marquee  L Lasso  W Magic Wand  C Crop  I Eyedropper\nB Brush  E Eraser  G Fill  U Shape  T Type  S Clone Stamp\nR Blur  H Hand  Z Zoom\n[ ] Adjust brush size\nArrow keys Nudge (Shift = 10px)  Space + drag to pan\nCtrl+Z Undo  Ctrl+Shift+Z Redo\nCtrl+A Select All  Ctrl+D Deselect  Ctrl+J Duplicate Layer\nCtrl+F Command Palette  Ctrl+T Transform  F Fullscreen\nCtrl+0 Fit to screen  Ctrl+Plus/Minus Zoom\nEnter Apply transform/crop  Esc Cancel');
        break;
      }
    }
  };

  const handleOpenFile = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return;
      const img = new Image();
      img.onload = () => {
        useEditorStore.getState().openImage(file.name.replace(/\.[^.]+$/, ''), img);
      };
      img.src = URL.createObjectURL(file);
    };
    input.click();
  };

  const handleExport = (format: 'png' | 'jpeg') => {
    const s = useEditorStore.getState();
    const p = s.projects.find(p => p.id === s.activeProjectId);
    if (!p) return;
    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = p.width;
    exportCanvas.height = p.height;
    const ctx = exportCanvas.getContext('2d')!;
    import('@/engine/renderer').then(({ renderProject }) => {
      renderProject(p, ctx, p.width, p.height);
      const link = document.createElement('a');
      link.download = `${p.name}.${format}`;
      link.href = exportCanvas.toDataURL(format === 'jpeg' ? 'image/jpeg' : 'image/png', 0.92);
      link.click();
    });
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
