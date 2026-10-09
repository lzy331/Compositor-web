import { useEditorStore } from '@/store/editorStore';
import { useT, translateHistory } from '@/i18n';
import type { HistoryEntry } from '@/types';

export default function HistoryPanel() {
  const history = useEditorStore((s) => s.history);
  const historyIndex = useEditorStore((s) => s.historyIndex);
  const panels = useEditorStore((s) => s.panels);
  const togglePanel = useEditorStore((s) => s.togglePanel);
  const t = useT();

  if (!panels.history) return null;

  // Most recent first
  const entries = [...history].reverse();

  const jumpTo = (originalIndex: number) => {
    useEditorStore.getState().jumpHistory(originalIndex);
  };

  return (
    <div className="panel" style={{ maxHeight: 200 }}>
      <div className="panel-header" onClick={() => togglePanel('history')}>
        <span>{t('panel.history')}</span>
        <span style={{ fontSize: 10, color: '#666' }}>{history.length}</span>
      </div>
      <div className="panel-body" style={{ padding: 0, maxHeight: 160 }}>
        {entries.length === 0 && (
          <div style={{ padding: 12, color: '#666', fontSize: 11, textAlign: 'center' }}>{t('history.empty')}</div>
        )}
        {entries.map((entry, i) => {
          const originalIndex = history.length - 1 - i;
          const isActive = originalIndex === historyIndex;
          return (
            <HistoryItem
              key={originalIndex}
              entry={entry}
              active={isActive}
              label={translateHistory(useEditorStore.getState().language, entry.description)}
              onClick={() => jumpTo(originalIndex)}
            />
          );
        })}
      </div>
    </div>
  );
}

function HistoryItem({ entry, active, label, onClick }: { entry: HistoryEntry; active: boolean; label: string; onClick: () => void }) {
  return (
    <div
      onClick={onClick}
      style={{
        padding: '5px 10px',
        cursor: 'pointer',
        fontSize: 12,
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        background: active ? '#3a5a8a' : 'transparent',
        color: active ? '#fff' : '#ccc',
      }}
    >
      <span style={{ fontSize: 10, opacity: 0.7 }}>
        {active ? '●' : '○'}
      </span>
      <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {label}
      </span>
    </div>
  );
}
