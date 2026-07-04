import type { WhiteboardElement } from '../protocol/subdocProtocol';

/** Approx char width at 16px for the mono-ish default font, for naive wrapping. */
const CHARS_PER_LINE = 34;
const CARD_WIDTH = 300;
const PAD = 16;
const LINE_HEIGHT_PX = 20;

function rand(): number {
  return Math.floor(Math.random() * 2 ** 31);
}

function wrap(text: string): string {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = '';
  for (const w of words) {
    if (line && (line + ' ' + w).length > CHARS_PER_LINE) {
      lines.push(line);
      line = w;
    } else {
      line = line ? `${line} ${w}` : w;
    }
  }
  if (line) lines.push(line);
  return lines.join('\n');
}

const commonEl = () => ({
  angle: 0,
  strokeColor: '#1e1e1e',
  fillStyle: 'solid' as const,
  strokeWidth: 1,
  strokeStyle: 'solid' as const,
  roughness: 1,
  opacity: 100,
  groupIds: [] as string[],
  frameId: null,
  seed: rand(),
  version: 1,
  versionNonce: rand(),
  isDeleted: false,
  boundElements: null,
  updated: Date.now(),
  link: null,
  locked: false,
});

/**
 * Build a labelled "question card" as two grouped Excalidraw elements (a rounded
 * rectangle + text) placed at `at`. Kept unbound (no containerId) to avoid
 * Excalidraw's strict bound-text invariants; grouped so they drag together.
 */
export function buildQuestionCardElements(
  text: string,
  at: { x: number; y: number },
  category?: string,
): WhiteboardElement[] {
  const groupId = `qg-${Date.now().toString(36)}-${rand().toString(36)}`;
  const label = category ? `[${category}] ` : '';
  const body = wrap(`${label}${text}`.trim());
  const lineCount = body.split('\n').length;
  const textHeight = lineCount * LINE_HEIGHT_PX;
  const height = textHeight + PAD * 2;

  const rect: WhiteboardElement = {
    ...commonEl(),
    id: `qcard-${Date.now().toString(36)}-${rand().toString(36)}`,
    type: 'rectangle',
    x: at.x,
    y: at.y,
    width: CARD_WIDTH,
    height,
    backgroundColor: '#fff9db',
    groupIds: [groupId],
    roundness: { type: 3 },
  };

  const textEl: WhiteboardElement = {
    ...commonEl(),
    id: `qtext-${Date.now().toString(36)}-${rand().toString(36)}`,
    type: 'text',
    x: at.x + PAD,
    y: at.y + PAD,
    width: CARD_WIDTH - PAD * 2,
    height: textHeight,
    backgroundColor: 'transparent',
    groupIds: [groupId],
    roundness: null,
    fontSize: 16,
    fontFamily: 1,
    text: body,
    textAlign: 'left',
    verticalAlign: 'top',
    containerId: null,
    originalText: body,
    lineHeight: 1.25,
    baseline: 14,
  };

  return [rect, textEl];
}
