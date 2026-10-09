import { useState, useEffect, useRef, useMemo } from 'react';
import { useEditorStore } from '@/store/editorStore';
import { useT, translate } from '@/i18n';
import { applyAdjustment } from '@/engine/filters';
import { exportProject, openImageFile } from '@/utils/fileIO';

interface CommandItem {
  labelKey: string;
  keywords?: string;
  run: () => void;
}

export default function CommandPalette() {
  const open = useEditorStore((s) => s.commandPaletteOpen);
  const language = useEditorStore((s) => s.language);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const t = useT();

  useEffect(() => {
    if (open) {
      setQuery('');
      setSelected(0);
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!useEditorStore.getState().commandPaletteOpen) return;
      if (e.key === 'Escape') {
        e.preventDefault();
        useEditorStore.getState().setCommandPaletteOpen(false);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const commands = useMemo<CommandItem[]>(() => {
    const s = useEditorStore.getState();
    const getProject = () => s.projects.find((p) => p.id === s.activeProjectId);
    const getActiveLayer = () => {
      const p = getProject();
      if (!p || !p.activeLayerId) return null;
      return p.layers.find((l) => l.id === p.activeLayerId) || null;
    };
    const applyToActiveLayer = (settings: Parameters<typeof applyAdjustment>[1], desc: string) => {
      const layer = getActiveLayer();
      if (!layer?.canvas) return;
      const ctx = layer.canvas.getContext('2d');
      if (!ctx) return;
      s.pushHistory(desc);
      const imgData = ctx.getImageData(0, 0, layer.width, layer.height);
      const result = applyAdjustment(imgData, settings);
      ctx.putImageData(result, 0, 0);
    };

    return [
      { labelKey: 'cmd.newProject', keywords: 'new create 新建 创建', run: () => s.setDialog('new') },
      { labelKey: 'cmd.open', keywords: 'open file image import 打开 文件 导入', run: () => openImageFile() },
      { labelKey: 'cmd.exportPng', keywords: 'export save png 导出 保存', run: () => exportProject('png') },
      { labelKey: 'cmd.exportJpeg', keywords: 'export save jpeg jpg 导出 保存', run: () => exportProject('jpeg') },
      { labelKey: 'cmd.undo', keywords: 'undo revert 撤销', run: () => s.undo() },
      { labelKey: 'cmd.redo', keywords: 'redo 重做', run: () => s.redo() },
      { labelKey: 'cmd.duplicateLayer', keywords: 'duplicate layer copy 复制 图层', run: () => { const p = getProject(); if (p?.activeLayerId) s.duplicateLayer(p.activeLayerId); } },
      { labelKey: 'cmd.deleteLayer', keywords: 'delete layer remove 删除 图层', run: () => { const p = getProject(); if (p?.activeLayerId) s.deleteLayer(p.activeLayerId); } },
      { labelKey: 'cmd.mergeDown', keywords: 'merge layer down flatten 合并 图层', run: () => s.mergeDown() },
      { labelKey: 'cmd.flipH', keywords: 'flip horizontal mirror 水平 翻转', run: () => s.flipCanvas('horizontal') },
      { labelKey: 'cmd.flipV', keywords: 'flip vertical mirror 垂直 翻转', run: () => s.flipCanvas('vertical') },
      { labelKey: 'cmd.rotateCW', keywords: 'rotate clockwise cw 旋转 顺时针', run: () => s.rotateLayer(90) },
      { labelKey: 'cmd.rotateCCW', keywords: 'rotate counter ccw 旋转 逆时针', run: () => s.rotateLayer(-90) },
      { labelKey: 'cmd.levels', keywords: 'levels adjustment 色阶 调整', run: () => s.setDialog('levels') },
      { labelKey: 'cmd.curves', keywords: 'curves adjustment brightness 曲线 调整 亮度', run: () => s.setDialog('curves') },
      { labelKey: 'cmd.hsl', keywords: 'hsl hue saturation color 色相 饱和度 颜色', run: () => s.setDialog('hsl') },
      { labelKey: 'cmd.invert', keywords: 'invert colors 反相', run: () => applyToActiveLayer({ type: 'invert', params: {} }, 'Invert') },
      { labelKey: 'cmd.bw', keywords: 'bw black white desaturate grayscale 黑白', run: () => applyToActiveLayer({ type: 'bw', params: {} }, 'Black & White') },
      { labelKey: 'cmd.gaussianBlur', keywords: 'blur gaussian filter 模糊 高斯', run: () => applyToActiveLayer({ type: 'gaussian-blur', params: { radius: 5 } }, 'Gaussian Blur') },
      { labelKey: 'cmd.addNoise', keywords: 'noise grain filter 杂色 噪点', run: () => applyToActiveLayer({ type: 'noise', params: { amount: 15, monochrome: false } }, 'Add Noise') },
      { labelKey: 'cmd.selectAll', keywords: 'select all selection 全选', run: () => { const p = getProject(); if (p) s.setSelection({ x: 0, y: 0, width: p.width, height: p.height, type: 'rect' }); } },
      { labelKey: 'cmd.deselect', keywords: 'deselect selection none 取消选择', run: () => s.setSelection(null) },
      { labelKey: 'cmd.zoomIn', keywords: 'zoom in magnify 放大', run: () => s.zoomIn() },
      { labelKey: 'cmd.zoomOut', keywords: 'zoom out 缩小', run: () => s.zoomOut() },
      { labelKey: 'cmd.fitScreen', keywords: 'fit screen zoom reset 适合屏幕', run: () => s.fitToScreen() },
      { labelKey: 'cmd.toggleRulers', keywords: 'rulers toggle 标尺', run: () => s.toggleRulers() },
      { labelKey: 'cmd.toggleGrid', keywords: 'grid toggle 网格', run: () => s.toggleGrid() },
      { labelKey: 'cmd.fullscreen', keywords: 'fullscreen toggle 全屏', run: () => s.toggleFullscreen() },
    ];
  }, [language]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return commands;
    return commands.filter((c) =>
      translate(language, c.labelKey).toLowerCase().includes(q) || (c.keywords ?? '').toLowerCase().includes(q)
    );
  }, [query, commands, language]);

  useEffect(() => {
    setSelected(0);
  }, [query]);

  if (!open) return null;

  const runCommand = (cmd: CommandItem) => {
    cmd.run();
    useEditorStore.getState().setCommandPaletteOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelected((n) => Math.min(filtered.length - 1, n + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelected((n) => Math.max(0, n - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const cmd = filtered[selected];
      if (cmd) runCommand(cmd);
    }
  };

  return (
    <div className="modal-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) useEditorStore.getState().setCommandPaletteOpen(false); }}>
      <div className="modal" style={{ minWidth: 420, padding: 0, overflow: 'hidden' }} onMouseDown={(e) => e.stopPropagation()}>
        <div style={{ padding: '12px 16px', borderBottom: '1px solid #333' }}>
          <input
            ref={inputRef}
            className="prop-input"
            style={{ width: '100%', fontSize: 13, padding: '8px 10px' }}
            placeholder={t('cmd.placeholder')}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
          />
        </div>
        <div style={{ maxHeight: 320, overflowY: 'auto', padding: '4px 0' }}>
          {filtered.length === 0 && (
            <div style={{ padding: '16px', color: '#888', textAlign: 'center', fontSize: 12 }}>{t('cmd.noMatch')}</div>
          )}
          {filtered.map((cmd, i) => (
            <div
              key={cmd.labelKey}
              onClick={() => runCommand(cmd)}
              onMouseEnter={() => setSelected(i)}
              style={{
                padding: '8px 16px',
                cursor: 'pointer',
                fontSize: 13,
                background: i === selected ? '#3a5a8a' : 'transparent',
                color: i === selected ? '#fff' : '#e0e0e0',
              }}
            >
              {translate(language, cmd.labelKey)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
