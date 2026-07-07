export function isEditableTarget(target: EventTarget | null): target is HTMLElement {
  if (typeof HTMLElement === 'undefined') return false;
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName.toLowerCase();
  const role = target.getAttribute('role')?.toLowerCase();
  return (
    tag === 'input' ||
    tag === 'textarea' ||
    tag === 'select' ||
    role === 'textbox' ||
    target.isContentEditable ||
    target.closest('[contenteditable="true"], .cm-editor') != null
  );
}
