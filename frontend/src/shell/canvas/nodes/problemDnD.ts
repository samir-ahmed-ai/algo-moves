/** MIME type for dragging a catalog problem onto the canvas. */
export const PROBLEM_DND_KEY = 'application/algomove-problem';

function normalizeProblemId(itemId: string): string | null {
  const id = itemId.trim();
  return id.length > 0 ? id : null;
}

export function encodeProblemDrag(itemId: string): string {
  return normalizeProblemId(itemId) ?? '';
}

export function decodeProblemDrag(raw: string): string | null {
  return normalizeProblemId(raw);
}

export function readProblemDrop(dataTransfer: DataTransfer): string | null {
  try {
    return decodeProblemDrag(dataTransfer.getData(PROBLEM_DND_KEY));
  } catch {
    return null;
  }
}
