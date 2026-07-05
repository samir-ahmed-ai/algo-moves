import type { WhiteboardPayload } from '../protocol/subdocProtocol';

function download(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function safeName(title: string): string {
  return (title.trim() || 'interview-board').replace(/[^a-z0-9-_]+/gi, '-').toLowerCase();
}

/**
 * Export the interview whiteboard. JSON is engine-agnostic; SVG lazily pulls
 * Excalidraw's `exportToSvg` so the runtime stays out of the initial bundle.
 */
export async function exportInterviewBoard(
  payload: WhiteboardPayload,
  title: string,
  fmt: 'svg' | 'json',
): Promise<void> {
  const name = safeName(title);
  if (fmt === 'json') {
    const doc = { type: 'excalidraw', version: 2, elements: payload.elements, appState: payload.appState ?? {} };
    download(`${name}.json`, new Blob([JSON.stringify(doc, null, 2)], { type: 'application/json' }));
    return;
  }
  const { exportToSvg } = await import('@excalidraw/excalidraw');
  const svg = await exportToSvg({
    elements: payload.elements as never,
    appState: { ...(payload.appState ?? {}), exportBackground: true, viewBackgroundColor: '#ffffff' } as never,
    files: (payload.files ?? {}) as never,
  });
  download(`${name}.svg`, new Blob([svg.outerHTML], { type: 'image/svg+xml' }));
}
