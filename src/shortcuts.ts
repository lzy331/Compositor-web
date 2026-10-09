// Photoshop-style keyboard shortcut reference. `keys` is display-only;
// `labelKey` resolves through the i18n dictionaries.
export interface ShortcutEntry {
  keys: string;
  labelKey: string;
}
export interface ShortcutGroup {
  titleKey: string;
  entries: ShortcutEntry[];
}

export const SHORTCUT_GROUPS: ShortcutGroup[] = [
  {
    titleKey: 'sc.file',
    entries: [
      { keys: 'Ctrl + N', labelKey: 'menu.new' },
      { keys: 'Ctrl + O', labelKey: 'menu.open' },
      { keys: 'Ctrl + S', labelKey: 'menu.exportPng' },
      { keys: 'Ctrl + Shift + S', labelKey: 'menu.exportJpeg' },
      { keys: 'Ctrl + W', labelKey: 'sc.closeProject' },
    ],
  },
  {
    titleKey: 'sc.edit',
    entries: [
      { keys: 'Ctrl + Z', labelKey: 'menu.undo' },
      { keys: 'Ctrl + Shift + Z / Ctrl + Y', labelKey: 'menu.redo' },
      { keys: 'Ctrl + C', labelKey: 'menu.copyLayer' },
      { keys: 'Ctrl + X', labelKey: 'sc.cutLayer' },
      { keys: 'Ctrl + V', labelKey: 'menu.pasteLayer' },
      { keys: 'Ctrl + A', labelKey: 'menu.selectAll' },
      { keys: 'Ctrl + D', labelKey: 'menu.deselect' },
      { keys: 'Ctrl + Shift + D', labelKey: 'sc.reselect' },
      { keys: 'Alt + Backspace', labelKey: 'sc.fillFg' },
      { keys: 'Ctrl + Backspace', labelKey: 'sc.fillBg' },
      { keys: 'Delete / Backspace', labelKey: 'sc.delete' },
    ],
  },
  {
    titleKey: 'sc.layers',
    entries: [
      { keys: 'Ctrl + Shift + N', labelKey: 'menu.newLayer' },
      { keys: 'Ctrl + J', labelKey: 'menu.duplicateLayer' },
      { keys: 'Ctrl + E', labelKey: 'menu.mergeDown' },
      { keys: 'Ctrl + Shift + E', labelKey: 'sc.mergeVisible' },
      { keys: 'Ctrl + ]', labelKey: 'sc.bringForward' },
      { keys: 'Ctrl + [', labelKey: 'sc.sendBackward' },
      { keys: 'Ctrl + Shift + ]', labelKey: 'sc.bringFront' },
      { keys: 'Ctrl + Shift + [', labelKey: 'sc.sendBack' },
      { keys: 'Alt + ]', labelKey: 'sc.nextLayer' },
      { keys: 'Alt + [', labelKey: 'sc.prevLayer' },
    ],
  },
  {
    titleKey: 'sc.tools',
    entries: [
      { keys: 'V', labelKey: 'tool.move' },
      { keys: 'M', labelKey: 'tool.marquee' },
      { keys: 'L', labelKey: 'tool.lasso' },
      { keys: 'W', labelKey: 'tool.magic' },
      { keys: 'C', labelKey: 'tool.crop' },
      { keys: 'I', labelKey: 'tool.eyedropper' },
      { keys: 'B', labelKey: 'tool.brush' },
      { keys: 'E', labelKey: 'tool.eraser' },
      { keys: 'G', labelKey: 'sc.fillGradient' },
      { keys: 'U', labelKey: 'tool.shape' },
      { keys: 'T', labelKey: 'tool.text' },
      { keys: 'S', labelKey: 'tool.clone' },
      { keys: 'R', labelKey: 'tool.blur' },
      { keys: 'H', labelKey: 'tool.hand' },
      { keys: 'Z', labelKey: 'tool.zoom' },
      { keys: 'Space + Drag', labelKey: 'sc.pan' },
      { keys: 'Ctrl + T', labelKey: 'sc.transform' },
    ],
  },
  {
    titleKey: 'sc.brush',
    entries: [
      { keys: '[ / ]', labelKey: 'sc.brushSize' },
      { keys: 'Shift + [ / ]', labelKey: 'sc.brushHardness' },
      { keys: '1 … 9', labelKey: 'sc.brushOpacity' },
      { keys: 'Shift + 1 … 9', labelKey: 'sc.brushFlow' },
      { keys: 'Shift + Click', labelKey: 'sc.straightLine' },
      { keys: 'Arrow Keys', labelKey: 'sc.nudge' },
    ],
  },
  {
    titleKey: 'sc.view',
    entries: [
      { keys: 'Ctrl + 0', labelKey: 'menu.fitScreen' },
      { keys: 'Ctrl + 1', labelKey: 'sc.actualPixels' },
      { keys: 'Ctrl + + / Ctrl + -', labelKey: 'sc.zoomKeys' },
      { keys: 'Alt + Scroll', labelKey: 'sc.zoomScroll' },
      { keys: 'Ctrl + R', labelKey: 'menu.rulers' },
      { keys: "Ctrl + '", labelKey: 'menu.grid' },
      { keys: 'Ctrl + ;', labelKey: 'sc.guides' },
      { keys: 'Tab', labelKey: 'sc.hidePanels' },
      { keys: 'F', labelKey: 'menu.fullscreen' },
      { keys: 'Ctrl + F', labelKey: 'sc.commandPalette' },
      { keys: 'Enter', labelKey: 'sc.apply' },
      { keys: 'Esc', labelKey: 'sc.cancel' },
    ],
  },
  {
    titleKey: 'sc.image',
    entries: [
      { keys: 'Ctrl + L', labelKey: 'menu.adjLevels' },
      { keys: 'Ctrl + M', labelKey: 'menu.adjCurves' },
      { keys: 'Ctrl + U', labelKey: 'menu.adjHsl' },
      { keys: 'Ctrl + I', labelKey: 'menu.adjInvert' },
      { keys: 'Ctrl + Shift + U', labelKey: 'menu.adjBw' },
      { keys: 'Ctrl + Alt + I', labelKey: 'menu.imageSize' },
      { keys: 'Ctrl + Alt + C', labelKey: 'menu.canvasSize' },
    ],
  },
];