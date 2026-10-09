import { useState, useEffect, useRef } from 'react';
import { useEditorStore } from '@/store/editorStore';
import { useT } from '@/i18n';
import { applyAdjustment } from '@/engine/filters';
import type { AdjustmentSettings } from '@/types';

export default function Dialogs() {
  const dialog = useEditorStore((s) => s.dialog);

  if (!dialog.type) return null;

  return (
    <div className="modal-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) useEditorStore.getState().setDialog(null); }}>
      <div className="modal" onMouseDown={(e) => e.stopPropagation()}>
        {dialog.type === 'new' && <NewDialog />}
        {dialog.type === 'imageSize' && <SizeDialog titleKey="dlg.imageSize" mode="image" />}
        {dialog.type === 'canvasSize' && <SizeDialog titleKey="dlg.canvasSize" mode="canvas" />}
        {dialog.type === 'levels' && <LevelsDialog />}
        {dialog.type === 'curves' && <CurvesDialog />}
        {dialog.type === 'hsl' && <HslDialog />}
      </div>
    </div>
  );
}

function closeDialog() {
  useEditorStore.getState().setDialog(null);
}

function NewDialog() {
  const project = useEditorStore((s) => s.projects.find((p) => p.id === s.activeProjectId));
  const [width, setWidth] = useState(project?.width ?? 800);
  const [height, setHeight] = useState(project?.height ?? 600);
  const [name, setName] = useState('Untitled');
  const t = useT();

  return (
    <>
      <h3>{t('dlg.newProject')}</h3>
      <div className="modal-form-row">
        <label>{t('dlg.name')}</label>
        <input value={name} onChange={(e) => setName(e.target.value)} autoFocus />
      </div>
      <div className="modal-form-row">
        <label>{t('dlg.width')}</label>
        <input type="number" value={width} min={1} onChange={(e) => setWidth(Math.max(1, parseInt(e.target.value) || 1))} />
      </div>
      <div className="modal-form-row">
        <label>{t('dlg.height')}</label>
        <input type="number" value={height} min={1} onChange={(e) => setHeight(Math.max(1, parseInt(e.target.value) || 1))} />
      </div>
      <div className="modal-actions">
        <button className="btn" onClick={closeDialog}>{t('dlg.cancel')}</button>
        <button className="btn btn-primary" onClick={() => {
          useEditorStore.getState().newProject(width, height, name);
          closeDialog();
        }}>{t('dlg.ok')}</button>
      </div>
    </>
  );
}

function SizeDialog({ titleKey, mode }: { titleKey: string; mode: 'image' | 'canvas' }) {
  const project = useEditorStore((s) => s.projects.find((p) => p.id === s.activeProjectId));
  const [width, setWidth] = useState(project?.width ?? 800);
  const [height, setHeight] = useState(project?.height ?? 600);
  const t = useT();

  return (
    <>
      <h3>{t(titleKey)}</h3>
      <div className="modal-form-row">
        <label>{t('dlg.width')}</label>
        <input type="number" value={width} min={1} onChange={(e) => setWidth(Math.max(1, parseInt(e.target.value) || 1))} />
      </div>
      <div className="modal-form-row">
        <label>{t('dlg.height')}</label>
        <input type="number" value={height} min={1} onChange={(e) => setHeight(Math.max(1, parseInt(e.target.value) || 1))} />
      </div>
      <div className="modal-actions">
        <button className="btn" onClick={closeDialog}>{t('dlg.cancel')}</button>
        <button className="btn btn-primary" onClick={() => {
          const s = useEditorStore.getState();
          if (mode === 'image') s.resizeImage(width, height);
          else s.resizeCanvas(width, height);
          closeDialog();
        }}>{t('dlg.apply')}</button>
      </div>
    </>
  );
}

// Hook that captures the active layer's original ImageData and allows
// live-applying an adjustment, restoring from original on each change.
function useLiveAdjustment() {
  const originalRef = useRef<ImageData | null>(null);
  const appliedRef = useRef(false);

  const captureOriginal = () => {
    if (originalRef.current) return;
    const s = useEditorStore.getState();
    const p = s.projects.find((pr) => pr.id === s.activeProjectId);
    if (!p || !p.activeLayerId) return;
    const layer = p.layers.find((l) => l.id === p.activeLayerId);
    if (!layer?.canvas) return;
    const ctx = layer.canvas.getContext('2d');
    if (!ctx) return;
    originalRef.current = ctx.getImageData(0, 0, layer.width, layer.height);
  };

  const apply = (settings: AdjustmentSettings) => {
    if (!originalRef.current) return;
    const s = useEditorStore.getState();
    const p = s.projects.find((pr) => pr.id === s.activeProjectId);
    if (!p || !p.activeLayerId) return;
    const layer = p.layers.find((l) => l.id === p.activeLayerId);
    if (!layer?.canvas) return;
    const ctx = layer.canvas.getContext('2d');
    if (!ctx) return;
    const result = applyAdjustment(originalRef.current, settings);
    ctx.putImageData(result, 0, 0);
    appliedRef.current = true;
  };

  const commit = (description: string) => {
    if (appliedRef.current) {
      useEditorStore.getState().pushHistory(description);
    }
    originalRef.current = null;
    appliedRef.current = false;
  };

  const revert = () => {
    if (originalRef.current && appliedRef.current) {
      const s = useEditorStore.getState();
      const p = s.projects.find((pr) => pr.id === s.activeProjectId);
      if (!p || !p.activeLayerId) return;
      const layer = p.layers.find((l) => l.id === p.activeLayerId);
      if (!layer?.canvas) return;
      const ctx = layer.canvas.getContext('2d');
      if (ctx) ctx.putImageData(originalRef.current, 0, 0);
    }
    originalRef.current = null;
    appliedRef.current = false;
  };

  return { captureOriginal, apply, commit, revert };
}

function LevelsDialog() {
  const [inputBlack, setInputBlack] = useState(0);
  const [inputWhite, setInputWhite] = useState(255);
  const [gamma, setGamma] = useState(1);
  const [outputBlack, setOutputBlack] = useState(0);
  const [outputWhite, setOutputWhite] = useState(255);
  const { captureOriginal, apply, commit, revert } = useLiveAdjustment();
  const t = useT();

  useEffect(() => {
    captureOriginal();
  }, [captureOriginal]);

  const applyLive = (overrides: Partial<{ inputBlack: number; inputWhite: number; gamma: number; outputBlack: number; outputWhite: number }>) => {
    const merged = { inputBlack, inputWhite, gamma, outputBlack, outputWhite, ...overrides };
    apply({ type: 'levels', params: merged });
  };

  return (
    <>
      <h3>{t('dlg.levels')}</h3>
      <SliderRow label={t('dlg.inputBlack')} value={inputBlack} min={0} max={255} step={1} onChange={(v) => { setInputBlack(v); applyLive({ inputBlack: v }); }} />
      <SliderRow label={t('dlg.inputWhite')} value={inputWhite} min={0} max={255} step={1} onChange={(v) => { setInputWhite(v); applyLive({ inputWhite: v }); }} />
      <SliderRow label={t('dlg.gamma')} value={gamma} min={0.1} max={3} step={0.1} onChange={(v) => { setGamma(v); applyLive({ gamma: v }); }} />
      <SliderRow label={t('dlg.outputBlack')} value={outputBlack} min={0} max={255} step={1} onChange={(v) => { setOutputBlack(v); applyLive({ outputBlack: v }); }} />
      <SliderRow label={t('dlg.outputWhite')} value={outputWhite} min={0} max={255} step={1} onChange={(v) => { setOutputWhite(v); applyLive({ outputWhite: v }); }} />
      <div className="modal-actions">
        <button className="btn" onClick={() => { revert(); closeDialog(); }}>{t('dlg.cancel')}</button>
        <button className="btn btn-primary" onClick={() => { commit('Levels'); closeDialog(); }}>{t('dlg.ok')}</button>
      </div>
    </>
  );
}

function CurvesDialog() {
  const [brightness, setBrightness] = useState(0);
  const { captureOriginal, apply, commit, revert } = useLiveAdjustment();
  const t = useT();

  useEffect(() => {
    captureOriginal();
  }, [captureOriginal]);

  const applyLive = (value: number) => {
    // Map brightness -50..50 to exposure adjustment
    const exposure = value / 50;
    apply({ type: 'exposure', params: { exposure, gamma: 1, offset: 0 } });
  };

  return (
    <>
      <h3>{t('dlg.curves')}</h3>
      <SliderRow label={t('dlg.brightness')} value={brightness} min={-50} max={50} step={1} onChange={(v) => { setBrightness(v); applyLive(v); }} />
      <div className="modal-actions">
        <button className="btn" onClick={() => { revert(); closeDialog(); }}>{t('dlg.cancel')}</button>
        <button className="btn btn-primary" onClick={() => { commit('Curves'); closeDialog(); }}>{t('dlg.ok')}</button>
      </div>
    </>
  );
}

function HslDialog() {
  const [hue, setHue] = useState(0);
  const [saturation, setSaturation] = useState(0);
  const [lightness, setLightness] = useState(0);
  const { captureOriginal, apply, commit, revert } = useLiveAdjustment();
  const t = useT();

  useEffect(() => {
    captureOriginal();
  }, [captureOriginal]);

  const applyLive = (overrides: Partial<{ hue: number; saturation: number; lightness: number }>) => {
    const merged = { hue, saturation, lightness, ...overrides };
    apply({ type: 'hsl', params: merged });
  };

  return (
    <>
      <h3>{t('dlg.hsl')}</h3>
      <SliderRow label={t('prop.hue')} value={hue} min={-180} max={180} step={1} onChange={(v) => { setHue(v); applyLive({ hue: v }); }} />
      <SliderRow label={t('dlg.saturation')} value={saturation} min={-100} max={100} step={1} onChange={(v) => { setSaturation(v); applyLive({ saturation: v }); }} />
      <SliderRow label={t('dlg.lightness')} value={lightness} min={-100} max={100} step={1} onChange={(v) => { setLightness(v); applyLive({ lightness: v }); }} />
      <div className="modal-actions">
        <button className="btn" onClick={() => { revert(); closeDialog(); }}>{t('dlg.cancel')}</button>
        <button className="btn btn-primary" onClick={() => { commit('Hue/Saturation'); closeDialog(); }}>{t('dlg.ok')}</button>
      </div>
    </>
  );
}

function SliderRow({ label, value, min, max, step, onChange }: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="modal-form-row">
      <label>{label}</label>
      <input
        type="range"
        className="prop-slider"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
      />
      <span className="prop-value" style={{ width: 40 }}>{value}</span>
    </div>
  );
}
