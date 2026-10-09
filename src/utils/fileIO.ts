import { useEditorStore } from '@/store/editorStore';
import { renderProject } from '@/engine/renderer';

// Export the active project as a downloaded image file.
export function exportProject(format: 'png' | 'jpeg'): void {
  const s = useEditorStore.getState();
  const p = s.projects.find((pr) => pr.id === s.activeProjectId);
  if (!p) return;
  const canvas = document.createElement('canvas');
  canvas.width = p.width;
  canvas.height = p.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  renderProject(p, ctx, p.width, p.height);
  const link = document.createElement('a');
  link.download = `${p.name}.${format === 'jpeg' ? 'jpg' : 'png'}`;
  link.href = canvas.toDataURL(format === 'jpeg' ? 'image/jpeg' : 'image/png', 0.92);
  link.click();
}

// Open an image file from disk into a new project.
export function openImageFile(): void {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  input.onchange = () => {
    const file = input.files?.[0];
    if (!file) return;
    const img = new Image();
    img.onload = () => {
      useEditorStore.getState().openImage(file.name.replace(/\.[^.]+$/, ''), img);
    };
    img.src = URL.createObjectURL(file);
  };
  input.click();
}

// Read a File object as an image (used for drag & drop / import).
export function readImageFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}