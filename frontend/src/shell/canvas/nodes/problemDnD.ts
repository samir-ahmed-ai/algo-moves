/** MIME type for dragging a catalog problem onto the canvas. */
export const PROBLEM_DND_KEY = 'application/algomove-problem';

export function encodeProblemDrag(itemId: string): string {
  return itemId.trim();
}

export function decodeProblemDrag(raw: string): string | null {
  const id = raw.trim();
  return id.length > 0 ? id : null;
}

export function readProblemDrop(dataTransfer: DataTransfer): string | null {
  return decodeProblemDrag(dataTransfer.getData(PROBLEM_DND_KEY));
}
