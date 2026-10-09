import { useEditorStore } from '@/store/editorStore';
import { useT, translateLayerName } from '@/i18n';
import { applyAdjustment } from '@/engine/filters';

export default function PropertiesPanel() {
  const { projects, activeProjectId } = useEditorStore();
  const project = projects.find(p => p.id === activeProjectId);
  const layer = project?.layers.find(l => l.id === project.activeLayerId);
  const t = useT();
  const language = useEditorStore((s) => s.language);

  if (!project || !layer) {
    return (
      <div className="panel">
        <div className="panel-header">{t('panel.properties')}</div>
        <div className="panel-body" style={{ color: '#666', fontSize: 12 }}>{t('prop.noLayer')}</div>
      </div>
    );
  }

  const applyFilter = (type: any, params: Record<string, any>) => {
    if (!layer.canvas) return;
    const ctx = layer.canvas.getContext('2d')!;
    const imgData = ctx.getImageData(0, 0, layer.width, layer.height);
    const result = applyAdjustment(imgData, { type, params });
    ctx.putImageData(result, 0, 0);
  };

  return (
    <div className="panel">
      <div className="panel-header">{t('panel.properties')}</div>
      <div className="panel-body">
        <div className="prop-row">
          <span className="prop-label">{t('prop.name')}</span>
          <input
            key={layer.id + language}
            className="prop-input"
            value={translateLayerName(language, layer.name)}
            onChange={(e) => useEditorStore.getState().renameLayer(layer.id, e.target.value)}
          />
        </div>

        {/* Transform */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, marginBottom: 8 }}>
          <div className="prop-row" style={{ marginBottom: 0 }}>
            <span className="prop-label">X</span>
            <input type="number" className="prop-input" value={Math.round(layer.x)}
              onChange={(e) => { layer.x = parseInt(e.target.value) || 0; }} />
          </div>
          <div className="prop-row" style={{ marginBottom: 0 }}>
            <span className="prop-label">Y</span>
            <input type="number" className="prop-input" value={Math.round(layer.y)}
              onChange={(e) => { layer.y = parseInt(e.target.value) || 0; }} />
          </div>
          <div className="prop-row" style={{ marginBottom: 0 }}>
            <span className="prop-label">W</span>
            <input type="number" className="prop-input" value={Math.round(layer.width)}
              onChange={(e) => { layer.width = Math.max(1, parseInt(e.target.value) || 1); }} />
          </div>
          <div className="prop-row" style={{ marginBottom: 0 }}>
            <span className="prop-label">H</span>
            <input type="number" className="prop-input" value={Math.round(layer.height)}
              onChange={(e) => { layer.height = Math.max(1, parseInt(e.target.value) || 1); }} />
          </div>
        </div>
        <div className="prop-row">
          <span className="prop-label">{t('prop.angle')}</span>
          <input type="range" className="prop-slider" min={-180} max={180} value={layer.rotation || 0}
            onChange={(e) => useEditorStore.getState().setLayerRotation(layer.id, parseInt(e.target.value))} />
          <span className="prop-value">{layer.rotation || 0}°</span>
        </div>
        <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
          <button className="btn" style={{ flex: 1, fontSize: 10, padding: '3px' }} onClick={() => useEditorStore.getState().flipLayer('horizontal')}>{t('prop.flipH')}</button>
          <button className="btn" style={{ flex: 1, fontSize: 10, padding: '3px' }} onClick={() => useEditorStore.getState().flipLayer('vertical')}>{t('prop.flipV')}</button>
          <button className="btn" style={{ flex: 1, fontSize: 10, padding: '3px' }} onClick={() => useEditorStore.getState().rotateLayer(90)}>{t('prop.rot90')}</button>
        </div>

        {layer.type === 'text' && (
          <>
            <div className="prop-row">
              <span className="prop-label">{t('prop.text')}</span>
              <input
                className="prop-input"
                value={layer.text || ''}
                onChange={(e) => { layer.text = e.target.value; }}
              />
            </div>
            <div className="prop-row">
              <span className="prop-label">{t('prop.size')}</span>
              <input
                type="number"
                className="prop-input"
                value={layer.fontSize || 24}
                onChange={(e) => { layer.fontSize = parseInt(e.target.value) || 12; }}
              />
            </div>
            <div className="prop-row">
              <span className="prop-label">{t('prop.color')}</span>
              <input
                type="color"
                className="color-swatch"
                value={layer.textColor || '#000000'}
                onChange={(e) => { layer.textColor = e.target.value; }}
                style={{ width: 30, height: 22 }}
              />
            </div>
          </>
        )}

        {layer.type === 'shape' && (
          <>
            <div className="prop-row">
              <span className="prop-label">{t('opt.fill')}</span>
              <input
                type="color"
                className="color-swatch"
                value={layer.shapeFill || '#3b82f6'}
                onChange={(e) => { layer.shapeFill = e.target.value; }}
                style={{ width: 30, height: 22 }}
              />
            </div>
            <div className="prop-row">
              <span className="prop-label">{t('prop.stroke')}</span>
              <input
                type="number"
                className="prop-input"
                value={layer.shapeStrokeWidth || 0}
                min={0}
                onChange={(e) => { layer.shapeStrokeWidth = parseInt(e.target.value) || 0; }}
              />
            </div>
          </>
        )}

        {/* Adjustments */}
        <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid #333' }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#aaa', marginBottom: 6 }}>{t('prop.quickAdj')}</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
            <button className="btn" style={{ fontSize: 10, padding: '4px 6px' }} onClick={() => applyFilter('invert', {})}>{t('prop.invert')}</button>
            <button className="btn" style={{ fontSize: 10, padding: '4px 6px' }} onClick={() => applyFilter('bw', {})}>{t('prop.bw')}</button>
            <button className="btn" style={{ fontSize: 10, padding: '4px 6px' }} onClick={() => applyFilter('grain', { amount: 15 })}>{t('prop.grain')}</button>
            <button className="btn" style={{ fontSize: 10, padding: '4px 6px' }} onClick={() => applyFilter('noise', { amount: 15 })}>{t('prop.noise')}</button>
            <button className="btn" style={{ fontSize: 10, padding: '4px 6px' }} onClick={() => applyFilter('vignette', { strength: 40 })}>{t('prop.vignette')}</button>
            <button className="btn" style={{ fontSize: 10, padding: '4px 6px' }} onClick={() => applyFilter('gaussian-blur', { radius: 5 })}>{t('prop.blur')}</button>
          </div>
        </div>

        {/* HSL Adjustment */}
        <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid #333' }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#aaa', marginBottom: 6 }}>{t('prop.hsl')}</div>
          <div className="prop-row">
            <span className="prop-label">{t('prop.hue')}</span>
            <input type="range" className="prop-slider" min={-180} max={180} defaultValue={0}
              onChange={(e) => applyFilter('hsl', { hue: parseInt(e.target.value), saturation: 0, lightness: 0 })} />
          </div>
          <div className="prop-row">
            <span className="prop-label">{t('prop.sat')}</span>
            <input type="range" className="prop-slider" min={-100} max={100} defaultValue={0}
              onChange={(e) => applyFilter('hsl', { hue: 0, saturation: parseInt(e.target.value), lightness: 0 })} />
          </div>
        </div>
      </div>
    </div>
  );
}
