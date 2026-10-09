import { useEditorStore } from '@/store/editorStore';
import { useT } from '@/i18n';
import type { ToolId } from '@/types';

const TOOLS: { id: ToolId; icon: string; labelKey: string; shortcut: string }[] = [
  { id: 'move', icon: '⇥', labelKey: 'tool.move', shortcut: 'V' },
  { id: 'marquee', icon: '▭', labelKey: 'tool.marquee', shortcut: 'M' },
  { id: 'lasso', icon: '⭕', labelKey: 'tool.lasso', shortcut: 'L' },
  { id: 'magic', icon: '✦', labelKey: 'tool.magic', shortcut: 'W' },
  { id: 'crop', icon: '⌗', labelKey: 'tool.crop', shortcut: 'C' },
  { id: 'eyedropper', icon: '💧', labelKey: 'tool.eyedropper', shortcut: 'I' },
  { id: 'brush', icon: '🖌', labelKey: 'tool.brush', shortcut: 'B' },
  { id: 'eraser', icon: '▢', labelKey: 'tool.eraser', shortcut: 'E' },
  { id: 'fill', icon: '🪣', labelKey: 'tool.fill', shortcut: 'G' },
  { id: 'gradient', icon: '▤', labelKey: 'tool.gradient', shortcut: 'G' },
  { id: 'shape', icon: '◻', labelKey: 'tool.shape', shortcut: 'U' },
  { id: 'text', icon: 'T', labelKey: 'tool.text', shortcut: 'T' },
  { id: 'clone', icon: '⧉', labelKey: 'tool.clone', shortcut: 'S' },
  { id: 'blur', icon: '◌', labelKey: 'tool.blur', shortcut: 'R' },
  { id: 'hand', icon: '✋', labelKey: 'tool.hand', shortcut: 'H' },
  { id: 'zoom', icon: '🔍', labelKey: 'tool.zoom', shortcut: 'Z' },
];

export default function Toolbar() {
  const { tool, setToolId } = useEditorStore();
  const t = useT();

  return (
    <div className="toolbar">
      {TOOLS.map((tl) => (
        <button
          key={tl.id}
          className={`tool-btn ${tool.id === tl.id ? 'active' : ''}`}
          onClick={() => setToolId(tl.id)}
          title={`${t(tl.labelKey)} (${tl.shortcut})`}
        >
          {tl.icon}
          <span className="tooltip">{t(tl.labelKey)} — {tl.shortcut}</span>
        </button>
      ))}
    </div>
  );
}