import { useEffect } from 'react';
import { useEditorStore } from '@/store/editorStore';
import MenuBar from '@/components/MenuBar';
import TabBar from '@/components/TabBar';
import Toolbar from '@/components/Toolbar';
import CanvasViewport from '@/components/CanvasViewport';
import LayersPanel from '@/components/LayersPanel';
import PropertiesPanel from '@/components/PropertiesPanel';
import HistoryPanel from '@/components/HistoryPanel';
import ToolOptions from '@/components/ToolOptions';
import Dialogs from '@/components/Dialogs';
import CommandPalette from '@/components/CommandPalette';
import Navigator from '@/components/Navigator';

export default function App() {
  const { projects, activeProjectId, panels, fullscreen, showNavigator } = useEditorStore();

  useEffect(() => {
    if (projects.length > 0 && !activeProjectId) {
      useEditorStore.getState().setActiveProject(projects[0].id);
    }
  }, []);

  return (
    <div className="app" style={fullscreen ? { background: '#000' } : {}}>
      {!fullscreen && <MenuBar />}
      {!fullscreen && <TabBar />}
      {!fullscreen && <ToolOptions />}
      <div className="main-area">
        {!fullscreen && <Toolbar />}
        <CanvasViewport />
        {showNavigator && <Navigator />}
        {!fullscreen && (
          <div className="right-panels">
            {panels.properties && <PropertiesPanel />}
            {panels.layers && <LayersPanel />}
            {panels.history && <HistoryPanel />}
          </div>
        )}
      </div>
      {!fullscreen && (
        <div className="status-bar">
          <span>Compositor Web</span>
          {activeProjectId && projects.find(p => p.id === activeProjectId) && (() => {
            const p = projects.find(p => p.id === activeProjectId)!;
            return <span>{p.width} × {p.height}px | Zoom: {Math.round(p.zoom * 100)}%</span>;
          })()}
          <span style={{ marginLeft: 'auto', color: '#666' }}>Ctrl+F: commands | Ctrl+T: transform | F: fullscreen | Enter: apply | Esc: cancel</span>
        </div>
      )}
      <Dialogs />
      <CommandPalette />
    </div>
  );
}
