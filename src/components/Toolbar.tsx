import { useEditorStore } from '@/store/editorStore';
import type { ToolId } from '@/types';

const TOOLS: { id: ToolId; icon: string; label: string; shortcut: string }[] = [
  { id: 'move', icon: '⇥', label: 'Move', shortcut: 'V' },
  { id: 'marquee', icon: '▭', label: 'Marquee', shortcut: 'M' },
  { id: 'lasso', icon: '⭕', label: 'Lasso', shortcut: 'L' },
  { id: 'magic', icon: '✦', label: 'Magic Wand', shortcut: 'W' },
  { id: 'crop', icon: '⌗', label: 'Crop', shortcut: 'C' },
  { id: 'eyedropper', icon: '💧', label: 'Eyedropper', shortcut: 'I' },
  { id: 'brush', icon: '🖌', label: 'Brush', shortcut: 'B' },
  { id: 'eraser', icon: '▢', label: 'Eraser', shortcut: 'E' },
  { id: 'fill', icon: '🪣', label: 'Fill', shortcut: 'G' },
  { id: 'gradient', icon: '▤', label: 'Gradient', shortcut: 'G' },
  { id: 'shape', icon: '◻', label: 'Shape', shortcut: 'U' },
  { id: 'text', icon: 'T', label: 'Type', shortcut: 'T' },
  { id: 'clone', icon: '⧉', label: 'Clone Stamp', shortcut: 'S' },
  { id: 'blur', icon: '◌', label: 'Blur', shortcut: 'R' },
  { id: 'hand', icon: '✋', label: 'Hand', shortcut: 'H' },
  { id: 'zoom', icon: '🔍', label: 'Zoom', shortcut: 'Z' },
];

export default function Toolbar() {
  const { tool, setToolId } = useEditorStore();

  return (
    <div className="toolbar">
      {TOOLS.map((t) => (
        <button
          key={t.id}
          className={`tool-btn ${tool.id === t.id ? 'active' : ''}`}
          onClick={() => setToolId(t.id)}
          title={`${t.label} (${t.shortcut})`}
        >
          {t.icon}
          <span className="tooltip">{t.label} — {t.shortcut}</span>
        </button>
      ))}
    </div>
  );
}
