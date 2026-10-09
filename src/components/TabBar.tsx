import { useEditorStore } from '@/store/editorStore';

export default function TabBar() {
  const { projects, activeProjectId, setActiveProject, closeProject, newProject } = useEditorStore();

  return (
    <div className="tab-bar">
      {projects.map((p) => (
        <div
          key={p.id}
          className={`tab ${p.id === activeProjectId ? 'active' : ''}`}
          onClick={() => setActiveProject(p.id)}
        >
          <span>{p.name}</span>
          <span
            className="tab-close"
            onClick={(e) => {
              e.stopPropagation();
              if (projects.length > 1) closeProject(p.id);
            }}
          >
            ×
          </span>
        </div>
      ))}
      <div className="tab-add" onClick={() => newProject()} title="New project">
        +
      </div>
    </div>
  );
}
