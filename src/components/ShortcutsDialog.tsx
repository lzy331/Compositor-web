import { useEditorStore } from '@/store/editorStore';
import { useT } from '@/i18n';
import { SHORTCUT_GROUPS } from '@/shortcuts';

export default function ShortcutsDialog() {
  const t = useT();

  return (
    <>
      <h3>{t('sc.title')}</h3>
      <p style={{ fontSize: 11, color: '#888', marginBottom: 12 }}>{t('sc.hint')}</p>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '0 24px',
          maxHeight: '60vh',
          overflowY: 'auto',
          paddingRight: 4,
        }}
      >
        {SHORTCUT_GROUPS.map((group) => (
          <div key={group.titleKey} style={{ marginBottom: 12, breakInside: 'avoid' }}>
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: '#7aa7e0',
                textTransform: 'uppercase',
                letterSpacing: 0.5,
                marginBottom: 6,
                borderBottom: '1px solid #3a3a3a',
                paddingBottom: 3,
              }}
            >
              {t(group.titleKey)}
            </div>
            {group.entries.map((e) => (
              <div
                key={e.keys + e.labelKey}
                style={{ display: 'flex', justifyContent: 'space-between', gap: 10, fontSize: 11.5, padding: '2px 0' }}
              >
                <span style={{ color: '#ccc' }}>{t(e.labelKey)}</span>
                <span
                  style={{
                    fontFamily: 'Consolas, Monaco, monospace',
                    fontSize: 10.5,
                    color: '#e0e0e0',
                    background: '#1a1a1a',
                    border: '1px solid #444',
                    borderRadius: 3,
                    padding: '1px 6px',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {e.keys}
                </span>
              </div>
            ))}
          </div>
        ))}
      </div>
      <div className="modal-actions">
        <button className="btn btn-primary" onClick={() => useEditorStore.getState().setDialog(null)}>
          {t('dlg.ok')}
        </button>
      </div>
    </>
  );
}