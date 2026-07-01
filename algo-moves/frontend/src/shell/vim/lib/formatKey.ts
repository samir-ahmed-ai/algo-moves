const MODIFIER_KEYS = new Set(['Control', 'Meta', 'Alt', 'Shift']);

function formatKeyLabel(key: string): string {
  switch (key) {
    case 'ArrowUp':
      return '↑';
    case 'ArrowDown':
      return '↓';
    case 'ArrowLeft':
      return '←';
    case 'ArrowRight':
      return '→';
    case 'Escape':
      return 'Esc';
    case ' ':
      return 'Space';
    default:
      return key;
  }
}

/** e.g. `Ctrl+H`, `⌘+K`, `Alt+↑` */
export function formatKeyEvent(e: KeyboardEvent): string {
  const parts: string[] = [];
  if (e.ctrlKey) parts.push('Ctrl');
  if (e.metaKey) parts.push('⌘');
  if (e.altKey) parts.push('Alt');
  if (e.shiftKey && (e.key.length > 1 || e.ctrlKey || e.metaKey || e.altKey)) {
    parts.push('Shift');
  }
  if (!MODIFIER_KEYS.has(e.key)) {
    parts.push(formatKeyLabel(e.key));
  }
  return parts.join('+');
}

export function isModifierOnlyKey(key: string): boolean {
  return MODIFIER_KEYS.has(key);
}
