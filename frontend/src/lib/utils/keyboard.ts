export function isEditableTarget(target: EventTarget | null): target is HTMLElement {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName.toUpperCase();
  return (
    tag === 'INPUT' ||
    tag === 'TEXTAREA' ||
    tag === 'SELECT' ||
    target.getAttribute('role') === 'textbox' ||
    target.isContentEditable ||
    target.closest('.cm-editor') != null
  );
}
