import { useEditorStore } from '@/store/editorStore';

export default function ToolOptions() {
  const { tool, setTool } = useEditorStore();

  return (
    <div className="tool-options">
      {(tool.id === 'brush' || tool.id === 'eraser') && (
        <>
          <label>
            Size
            <input
              type="number"
              value={tool.brushSize}
              min={1}
              max={500}
              onChange={(e) => setTool({ brushSize: parseInt(e.target.value) || 1 })}
            />
          </label>
          <label>
            Hardness
            <input
              type="number"
              value={tool.brushHardness}
              min={0}
              max={100}
              onChange={(e) => setTool({ brushHardness: parseInt(e.target.value) || 0 })}
            />
          </label>
          <label>
            Opacity
            <input
              type="number"
              value={tool.brushOpacity}
              min={1}
              max={100}
              onChange={(e) => setTool({ brushOpacity: parseInt(e.target.value) || 1 })}
            />
          </label>
          <label>
            Color
            <input
              type="color"
              value={tool.brushColor}
              onChange={(e) => setTool({ brushColor: e.target.value })}
              style={{ width: 30, height: 22, border: 'none', background: 'none', cursor: 'pointer' }}
            />
          </label>
        </>
      )}
      {tool.id === 'shape' && (
        <>
          <label>
            Shape
            <select
              value={tool.shapeType}
              onChange={(e) => setTool({ shapeType: e.target.value as any })}
              style={{ background: '#1a1a1a', border: '1px solid #444', color: '#e0e0e0', borderRadius: 3, fontSize: 11, padding: '2px 4px' }}
            >
              <option value="rect">Rectangle</option>
              <option value="rounded-rect">Rounded Rect</option>
              <option value="ellipse">Ellipse</option>
              <option value="line">Line</option>
            </select>
          </label>
          <label>
            Fill
            <input
              type="color"
              value={tool.shapeFill}
              onChange={(e) => setTool({ shapeFill: e.target.value })}
              style={{ width: 30, height: 22, border: 'none', background: 'none', cursor: 'pointer' }}
            />
          </label>
        </>
      )}
      {tool.id === 'text' && (
        <>
          <label>
            Font
            <select
              value={tool.fontFamily}
              onChange={(e) => setTool({ fontFamily: e.target.value })}
              style={{ background: '#1a1a1a', border: '1px solid #444', color: '#e0e0e0', borderRadius: 3, fontSize: 11, padding: '2px 4px' }}
            >
              <option value="Arial">Arial</option>
              <option value="Georgia">Georgia</option>
              <option value="Courier New">Courier New</option>
              <option value="Times New Roman">Times New Roman</option>
              <option value="Verdana">Verdana</option>
            </select>
          </label>
          <label>
            Size
            <input
              type="number"
              value={tool.fontSize}
              min={8}
              max={200}
              onChange={(e) => setTool({ fontSize: parseInt(e.target.value) || 12 })}
            />
          </label>
          <label>
            Color
            <input
              type="color"
              value={tool.brushColor}
              onChange={(e) => setTool({ brushColor: e.target.value })}
              style={{ width: 30, height: 22, border: 'none', background: 'none', cursor: 'pointer' }}
            />
          </label>
        </>
      )}
      {tool.id === 'fill' && (
        <label>
          Color
          <input
            type="color"
            value={tool.brushColor}
            onChange={(e) => setTool({ brushColor: e.target.value })}
            style={{ width: 30, height: 22, border: 'none', background: 'none', cursor: 'pointer' }}
          />
        </label>
      )}
      {tool.id === 'gradient' && (
        <>
          <label>
            Type
            <select
              value={tool.gradientType}
              onChange={(e) => setTool({ gradientType: e.target.value as any })}
              style={{ background: '#1a1a1a', border: '1px solid #444', color: '#e0e0e0', borderRadius: 3, fontSize: 11, padding: '2px 4px' }}
            >
              <option value="linear">Linear</option>
              <option value="radial">Radial</option>
            </select>
          </label>
          <label>
            Color
            <input
              type="color"
              value={tool.brushColor}
              onChange={(e) => setTool({ brushColor: e.target.value })}
              style={{ width: 30, height: 22, border: 'none', background: 'none', cursor: 'pointer' }}
            />
          </label>
          <span style={{ fontSize: 10, color: '#888' }}>Drag on canvas to draw gradient</span>
        </>
      )}
      {tool.id === 'crop' && (
        <span style={{ fontSize: 10, color: '#888' }}>Drag on canvas to define crop area, then press Enter or Apply</span>
      )}
    </div>
  );
}
