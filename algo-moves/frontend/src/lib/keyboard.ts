export function isEditableTarget(target: EventTarget | null): target is HTMLElement {
  if (!(target instanceof HTMLElement)) return false;
  return (
    target.tagName === 'INPUT' ||
    target.tagName === 'TEXTAREA' ||
    target.tagName === 'SELECT' ||
    target.isContentEditable ||
    target.closest('.cm-editor') != null
  );
}
