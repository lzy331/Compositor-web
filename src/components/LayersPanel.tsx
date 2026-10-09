import { useRef, useEffect } from 'react';
import { useEditorStore } from '@/store/editorStore';
import { useT, translateLayerName } from '@/i18n';
import { renderLayerThumbnail } from '@/engine/renderer';
import { BLEND_MODES } from '@/engine/blendModes';
import type { LayerData } from '@/types';

export default function LayersPanel() {
  const { projects, activeProjectId, selectLayer, setLayerVisibility, addLayer, deleteLayer, duplicateLayer, setLayerBlendMode, setLayerOpacity } = useEditorStore();
  const project = projects.find(p => p.id === activeProjectId);
  const thumbRefs = useRef<Map<string, HTMLCanvasElement>>(new Map());
  const t = useT();
  const language = useEditorStore((s) => s.language);

  useEffect(() => {
    if (!project) return;
    // Render thumbnails
    for (const layer of project.layers) {
      const canvas = thumbRefs.current.get(layer.id);
      if (canvas) {
        const thumb = renderLayerThumbnail(layer, 32);
        canvas.getContext('2d')!.clearRect(0, 0, 32, 32);
        canvas.getContext('2d')!.drawImage(thumb, 0, 0);
      }
    }
  });

  if (!project) return null;

  // Layers are stored bottom-to-top; display top-to-bottom (reverse)
  const displayLayers = [...project.layers].reverse();

  const getTypeBadge = (layer: LayerData): string => {
    switch (layer.type) {
      case 'text': return 'T';
      case 'shape': return '◇';
      case 'gradient': return '▤';
      case 'adjustment': return '◎';
      default: return '';
    }
  };

  return (
    <div className="panel" style={{ flex: 1, minHeight: 0 }}>
      <div className="panel-header">
        <span>{t('panel.layers')}</span>
        <div style={{ display: 'flex', gap: 4 }}>
          <span style={{ cursor: 'pointer', fontSize: 14 }} onClick={() => addLayer('pixel')} title={t('layers.newLayer')}>＋</span>
          <span style={{ cursor: 'pointer', fontSize: 12 }} onClick={() => {
            const l = project.layers.find(l => l.id === project.activeLayerId);
            if (l) duplicateLayer(l.id);
          }} title={t('layers.duplicateLayer')}>⧉</span>
          <span style={{ cursor: 'pointer', fontSize: 14 }} onClick={() => {
            const l = project.layers.find(l => l.id === project.activeLayerId);
            if (l && project.layers.length > 1) deleteLayer(l.id);
          }} title={t('layers.deleteLayer')}>🗑</span>
        </div>
      </div>
      <div className="panel-body" style={{ flex: 1, overflowY: 'auto' }}>
        {displayLayers.map((layer) => (
          <div
            key={layer.id}
            className={`layer-item ${layer.id === project.activeLayerId ? 'active' : ''}`}
            onClick={() => selectLayer(layer.id)}
          >
            <span
              className="layer-vis"
              onClick={(e) => { e.stopPropagation(); setLayerVisibility(layer.id, !layer.visible); }}
              title={layer.visible ? t('layers.hide') : t('layers.show')}
            >
              {layer.visible ? '👁' : '—'}
            </span>
            <div className="layer-thumb">
              <canvas
                ref={(el) => { if (el) thumbRefs.current.set(layer.id, el); }}
                width={32}
                height={32}
              />
            </div>
            <div className="layer-info">
              <div className="layer-name">{translateLayerName(language, layer.name)}</div>
            </div>
            {layer.mask && layer.maskEnabled && (
              <span className="layer-badge" title={t('layers.layerMask')}>◐</span>
            )}
            {getTypeBadge(layer) && (
              <span className="layer-badge">{getTypeBadge(layer)}</span>
            )}
          </div>
        ))}
      </div>
      {/* Layer blend mode & opacity */}
      <div style={{ padding: '6px 8px', borderTop: '1px solid #333', display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div className="prop-row" style={{ marginBottom: 0 }}>
          <span className="prop-label">{t('layers.mode')}</span>
          <select
            className="prop-input"
            value={project.layers.find(l => l.id === project.activeLayerId)?.blendMode || 'normal'}
            onChange={(e) => {
              const l = project.layers.find(l => l.id === project.activeLayerId);
              if (l) setLayerBlendMode(l.id, e.target.value as any);
            }}
          >
            {BLEND_MODES.map(m => <option key={m} value={m}>{t('blend.' + m)}</option>)}
          </select>
        </div>
        <div className="prop-row" style={{ marginBottom: 0 }}>
          <span className="prop-label">{t('layers.opacity')}</span>
          <input
            type="range"
            className="prop-slider"
            min={0}
            max={100}
            value={project.layers.find(l => l.id === project.activeLayerId)?.opacity || 100}
            onChange={(e) => {
              const l = project.layers.find(l => l.id === project.activeLayerId);
              if (l) setLayerOpacity(l.id, parseInt(e.target.value));
            }}
          />
          <span className="prop-value">{project.layers.find(l => l.id === project.activeLayerId)?.opacity || 100}%</span>
        </div>
      </div>
    </div>
  );
}
