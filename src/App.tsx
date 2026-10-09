import { useEffect } from 'react';
import { useEditorStore } from '@/store/editorStore';
import MenuBar from '@/components/MenuBar';
import TabBar from '@/components/TabBar';
import Toolbar from '@/components/Toolbar';
import CanvasViewport from '@/components/CanvasViewport';
import LayersPanel from '@/components/LayersPanel';
import PropertiesPanel from '@/components/PropertiesPanel';
import ToolOptions from '@/components/ToolOptions';

export default function App() {
  const { projects, activeProjectId, panels } = useEditorStore();

  // Set first project as active on mount
  useEffect(() => {
    if (projects.length > 0 && !activeProjectId) {
      useEditorStore.getState().setActiveProject(projects[0].id);
    }
  }, []);

  return (
    <div className="app">
      <MenuBar />
      <TabBar />
      <ToolOptions />
      <div className="main-area">
        <Toolbar />
        <CanvasViewport />
        <div className="right-panels">
          {panels.properties && <PropertiesPanel />}
          {panels.layers && <LayersPanel />}
        </div>
      </div>
      <div className="status-bar">
        <span>Compositor Web</span>
        {activeProjectId && projects.find(p => p.id === activeProjectId) && (() => {
          const p = projects.find(p => p.id === activeProjectId)!;
          return <span>{p.width} × {p.height}px | Zoom: {Math.round(p.zoom * 100)}%</span>;
        })()}
      </div>
    </div>
  );
}
