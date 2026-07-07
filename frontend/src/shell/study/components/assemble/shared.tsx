import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Check,
  GripVertical,
  Lock,
  Puzzle,
  RotateCcw,
} from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { shuffle } from '@/lib/utils/shuffle';
import { ASSEMBLE_GAMES } from '@/components/puzzle/assemble';
import { assembleGameStatsStore } from '@/store/practice/assembleBest';
import { Btn, Chip, EmptyState, Label, Meter, nodeText, useCanvasStatic } from '@/shell/canvas';
import { useCodeStudioContent, useCodeStudioPhase } from '@/shell/study/hooks/useCodeStudio';
import type { CodePiece } from '@/lib/code';
import { blockKind, BLOCK_META } from '@/lib/code';
import { SortableRow, reorderIds } from '@/lib/dnd';

/* ----------------------------- shared helpers ----------------------------- */

export interface Line {
  text: string;
  indent: number;
}

export function indentUnits(s: string): number {
  const lead = /^[\t ]*/.exec(s)?.[0] ?? '';
  let tabs = 0;
  let spaces = 0;
  for (const ch of lead) ch === '\t' ? tabs++ : spaces++;
  return tabs + Math.round(spaces / 4);
}

export function codeLines(ref: string): Line[] {
  return ref
    .split('\n')
    .filter((l) => l.trim().length > 0)
    .map((l) => ({ text: l.trim(), indent: indentUnits(l) }));
}

/** Shuffle that avoids returning the already-correct order for short lists. */
export function scramble(ids: string[]): string[] {
  if (ids.length < 2) return ids.slice();
  let s = shuffle(ids);
  let guard = 0;
  while (s.every((id, i) => id === ids[i]) && guard++ < 8) s = shuffle(ids);
  return s;
}

export function Mono({ children, indent = 0 }: { children: ReactNode; indent?: number }) {
  return (
    <pre
      className={cn(
        'overflow-x-auto whitespace-pre font-mono leading-relaxed text-ink',
        nodeText.tight,
      )}
      style={indent ? { paddingLeft: `${indent * 14}px` } : undefined}
    >
      {children}
    </pre>
  );
}

export function SolvedBanner({ label }: { label: string }) {
  return (
    <div
      className={cn(
        'flex items-center gap-2 rounded-md border border-good/60 bg-goodbg/50 px-2.5 py-1.5 text-good',
        nodeText.tight,
      )}
    >
      <Check className="h-4 w-4" /> {label}
    </div>
  );
}

export function StepBtn({
  dir,
  disabled,
  onClick,
}: {
  dir: 'up' | 'down';
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="nodrag grid h-4 w-4 place-items-center rounded text-ink3 transition-colors hover:bg-panel2 hover:text-ink disabled:opacity-30"
    >
      {dir === 'up' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
    </button>
  );
}

export function OrderBoard({
  correctIds,
  renderRow,
  resetSig,
  onSolved,
  footer,
}: {
  correctIds: string[];
  renderRow: (id: string, info: { pos: number; correct: boolean }) => ReactNode;
  /** When this string changes, the board reshuffles (e.g. problem / language switch). */
  resetSig: string;
  onSolved?: () => void;
  footer?: (info: {
    solved: boolean;
    correctCount: number;
    total: number;
    reshuffle: () => void;
  }) => ReactNode;
}) {
  const [order, setOrder] = useState<string[]>(() => scramble(correctIds));
  const prev = useRef(resetSig);
  useEffect(() => {
    if (prev.current !== resetSig) {
      prev.current = resetSig;
      setOrder(scramble(correctIds));
    }
  }, [resetSig, correctIds]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));
  const move = (id: string, delta: number) =>
    setOrder((o) => {
      const i = o.indexOf(id);
      const j = i + delta;
      if (i < 0 || j < 0 || j >= o.length) return o;
      const n = o.slice();
      [n[i], n[j]] = [n[j], n[i]];
      return n;
    });
  const onDragEnd = (event: DragEndEvent) => setOrder((o) => reorderIds(o, event));

  const correctCount = order.filter((id, i) => correctIds[i] === id).length;
  const solved = correctCount === correctIds.length && correctIds.length > 0;
  const solvedRef = useRef(false);
  useEffect(() => {
    if (solved && !solvedRef.current) {
      solvedRef.current = true;
      onSolved?.();
    }
    if (!solved) solvedRef.current = false;
  }, [solved, onSolved]);

  return (
    <div className="flex flex-col gap-2">
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={order} strategy={verticalListSortingStrategy}>
          <div className="flex flex-col gap-1">
            {order.map((id, pos) => {
              const correct = correctIds[pos] === id;
              return (
                <SortableRow
                  key={id}
                  id={id}
                  className={cn(
                    'flex items-stretch gap-1.5 rounded-md border transition-colors',
                    correct
                      ? 'border-good/60 bg-goodbg/40'
                      : 'border-edge bg-panel2/50 hover:border-accent/50',
                  )}
                >
                  <div className="flex shrink-0 cursor-grab flex-col items-center justify-center gap-0.5 rounded-l-md border-r border-edge px-1 py-1">
                    <StepBtn dir="up" disabled={pos === 0} onClick={() => move(id, -1)} />
                    <span className={cn('font-mono tabular-nums text-ink3', nodeText['2xs'])}>
                      {pos + 1}
                    </span>
                    <StepBtn
                      dir="down"
                      disabled={pos === order.length - 1}
                      onClick={() => move(id, 1)}
                    />
                  </div>
                  <div className="min-w-0 flex-1 py-1.5 pr-2">
                    {renderRow(id, { pos, correct })}
                  </div>
                  <span className="grid w-5 shrink-0 place-items-center text-ink3">
                    {correct ? (
                      <Check className="h-3.5 w-3.5 text-good" />
                    ) : (
                      <GripVertical className="h-3.5 w-3.5 opacity-40" />
                    )}
                  </span>
                </SortableRow>
              );
            })}
          </div>
        </SortableContext>
      </DndContext>
      {footer?.({
        solved,
        correctCount,
        total: correctIds.length,
        reshuffle: () => setOrder(scramble(correctIds)),
      })}
    </div>
  );
}

function PuzzleBlock({
  piece,
  pos,
  correct,
  onUp,
  onDown,
}: {
  piece: CodePiece;
  pos: number;
  correct: boolean;
  onUp?: () => void;
  onDown?: () => void;
}) {
  const meta = BLOCK_META[blockKind(piece)];
  const Icon = meta.icon;
  return (
    <div className={cn('blk', meta.shape)} style={{ '--blk-stroke': meta.stroke } as CSSProperties}>
      <div className="blk-face">
        <div className="mb-1 flex items-center gap-1.5">
          <GripVertical className="h-3 w-3 shrink-0" style={{ color: meta.stroke }} />
          <span
            className={cn('font-mono tabular-nums', nodeText['2xs'])}
            style={{ color: meta.text }}
          >
            {pos + 1}
          </span>
          <Icon className="h-3 w-3 shrink-0" style={{ color: meta.text }} />
          <span
            className={cn('font-semibold uppercase tracking-[0.08em]', nodeText['2xs'])}
            style={{ color: meta.text }}
          >
            {correct ? 'locked' : meta.label}
          </span>
          <span className="flex-1" />
          {correct ? (
            <Lock className="h-3 w-3 shrink-0 text-good" />
          ) : (
            <span className="flex items-center gap-0.5">
              <button
                type="button"
                disabled={!onUp}
                onClick={onUp}
                className="nodrag blk-step"
                aria-label="Move up"
              >
                <ArrowUp className="h-3 w-3" />
              </button>
              <button
                type="button"
                disabled={!onDown}
                onClick={onDown}
                className="nodrag blk-step"
                aria-label="Move down"
              >
                <ArrowDown className="h-3 w-3" />
              </button>
            </span>
          )}
        </div>
        <Mono>{piece.code}</Mono>
      </div>
    </div>
  );
}

export function BlocksMode() {
  const { reference } = useCodeStudioContent();
  const { pieces } = useCodeStudioPhase();
  const resolved = pieces!;
  const correctIds = useMemo(() => resolved.map((p) => p.id), [resolved]);
  const byId = useMemo(() => new Map(resolved.map((p) => [p.id, p])), [resolved]);
  const resetSig = `${reference.length}:${resolved.length}`;

  const [order, setOrder] = useState<string[]>(() => scramble(correctIds));
  const prev = useRef(resetSig);
  useEffect(() => {
    if (prev.current !== resetSig) {
      prev.current = resetSig;
      setOrder(scramble(correctIds));
    }
  }, [resetSig, correctIds]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));
  const move = (id: string, delta: number) =>
    setOrder((o) => {
      const i = o.indexOf(id);
      const j = i + delta;
      if (i < 0 || j < 0 || j >= o.length) return o;
      const n = o.slice();
      [n[i], n[j]] = [n[j], n[i]];
      return n;
    });
  const onDragEnd = (event: DragEndEvent) => setOrder((o) => reorderIds(o, event));

  const correctCount = order.filter((id, i) => correctIds[i] === id).length;
  const solved = correctCount === correctIds.length && correctIds.length > 0;

  return (
    <div className="flex flex-col gap-2.5">
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={order} strategy={verticalListSortingStrategy}>
          <div className="blk-board pt-1.5">
            {order.map((id, pos) => {
              const correct = correctIds[pos] === id;
              return (
                <SortableRow
                  key={id}
                  id={id}
                  className={cn('blk-row', correct && 'blk-row--correct')}
                >
                  <PuzzleBlock
                    piece={byId.get(id)!}
                    pos={pos}
                    correct={correct}
                    onUp={pos > 0 ? () => move(id, -1) : undefined}
                    onDown={pos < order.length - 1 ? () => move(id, 1) : undefined}
                  />
                </SortableRow>
              );
            })}
          </div>
        </SortableContext>
      </DndContext>
      <Meter value={correctCount} max={correctIds.length} tone={solved ? 'good' : 'accent'} />
      {solved ? (
        <SolvedBanner label="Every block locked in source order — nicely done." />
      ) : (
        <Btn
          size="xs"
          variant="ghost"
          icon={<RotateCcw className="h-3.5 w-3.5" />}
          onClick={() => setOrder(scramble(correctIds))}
        >
          Shuffle
        </Btn>
      )}
    </div>
  );
}

export function ScrambleMode() {
  const { reference } = useCodeStudioContent();
  const lines = useMemo(() => codeLines(reference), [reference]);
  const correct = lines.map((_, i) => `l${i}`);
  const byId = useMemo(() => new Map(correct.map((id, i) => [id, lines[i]])), [correct, lines]);
  return (
    <OrderBoard
      correctIds={correct}
      resetSig={`${reference.length}:scr`}
      renderRow={(id) => {
        const l = byId.get(id)!;
        return <Mono indent={l.indent}>{l.text}</Mono>;
      }}
      footer={({ solved, correctCount, total, reshuffle }) => (
        <div className="flex flex-col gap-1.5">
          <Meter value={correctCount} max={total} tone={solved ? 'good' : 'accent'} />
          {solved ? (
            <SolvedBanner label="Every line back in order." />
          ) : (
            <Btn
              size="xs"
              variant="ghost"
              icon={<RotateCcw className="h-3.5 w-3.5" />}
              onClick={reshuffle}
            >
              Shuffle
            </Btn>
          )}
        </div>
      )}
    />
  );
}

export function FirstLetterMode() {
  const { reference } = useCodeStudioContent();
  const lines = useMemo(() => codeLines(reference), [reference]);
  const [vals, setVals] = useState<string[]>(() => lines.map(() => ''));
  useEffect(() => setVals(lines.map(() => '')), [reference, lines]);
  const norm = (s: string) => s.replace(/\s+/g, ' ').trim();

  let done = 0;
  const rows = lines.map((l, i) => {
    const tok = /^\S+/.exec(l.text)?.[0] ?? '';
    const rest = l.text.slice(tok.length).trimStart();
    const correct = norm(`${tok} ${vals[i]}`) === norm(l.text);
    if (correct) done++;
    return (
      <div key={i} className={cn('flex items-center gap-2 font-mono', nodeText.sm)}>
        <span style={{ paddingLeft: `${l.indent * 14}px` }} className="shrink-0 text-accent">
          {tok}
        </span>
        <input
          value={vals[i]}
          onChange={(e) => setVals((v) => v.map((x, k) => (k === i ? e.target.value : x)))}
          placeholder={rest ? '·'.repeat(Math.min(rest.length, 18)) : '↵'}
          className={cn(
            'nodrag min-w-0 flex-1 rounded border bg-panel2 px-1.5 py-0.5 outline-none',
            correct ? 'border-good/60 text-good' : 'border-edge text-ink focus:border-accent',
          )}
        />
        {correct && <Check className="h-3.5 w-3.5 shrink-0 text-good" />}
      </div>
    );
  });

  return (
    <div className="flex flex-col gap-1.5">
      {rows}
      <div className="mt-1">
        <Meter value={done} max={lines.length} tone={done === lines.length ? 'good' : 'accent'} />
      </div>
    </div>
  );
}

const CLOZE_KEYWORDS = [
  'func',
  'for',
  'if',
  'else',
  'return',
  'range',
  'len',
  'append',
  'var',
  'make',
  'break',
  'continue',
  'int',
  'bool',
  'string',
  'true',
  'false',
  'nil',
  'map',
];

type ClozeSeg = { t: 'text'; v: string } | { t: 'blank'; id: string; answer: string };

function buildCloze(ref: string): ClozeSeg[][] {
  const kw = new RegExp(`\\b(${CLOZE_KEYWORDS.join('|')})\\b`, 'g');
  const MAX = 14;
  let count = 0;
  return ref.split('\n').map((line) => {
    const segs: ClozeSeg[] = [];
    let last = 0;
    let m: RegExpExecArray | null;
    kw.lastIndex = 0;
    while ((m = kw.exec(line)) !== null) {
      if (count >= MAX) break;
      segs.push({ t: 'text', v: line.slice(last, m.index) });
      segs.push({ t: 'blank', id: `b${count}`, answer: m[0] });
      last = m.index + m[0].length;
      count++;
    }
    segs.push({ t: 'text', v: line.slice(last) });
    return segs;
  });
}

export function ClozeMode() {
  const { reference } = useCodeStudioContent();
  const segments = useMemo(() => buildCloze(reference), [reference]);
  const [vals, setVals] = useState<Record<string, string>>({});
  useEffect(() => setVals({}), [reference]);

  const blanks = segments
    .flat()
    .filter((s): s is Extract<ClozeSeg, { t: 'blank' }> => s.t === 'blank');
  const bank = Array.from(new Set(blanks.map((b) => b.answer))).sort();
  const done = blanks.filter((b) => vals[b.id] === b.answer).length;

  if (blanks.length === 0) {
    return (
      <EmptyState
        icon={<Puzzle className="h-4 w-4" />}
        title="No keywords to hide"
        hint="This source has no recognised keywords for a cloze drill."
      />
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-1">
        <Label>Word bank</Label>
        {bank.map((w) => (
          <Chip key={w} tone="muted" mono>
            {w}
          </Chip>
        ))}
      </div>
      <div
        className={cn(
          'ws-scroll overflow-x-auto rounded-md border border-edge bg-panel2/40 p-2 font-mono leading-relaxed',
          nodeText.tight,
        )}
      >
        {segments.map((line, i) => (
          <div key={i} className="flex flex-wrap items-center whitespace-pre">
            {line.map((s, j) =>
              s.t === 'text' ? (
                <span key={j} className="text-ink">
                  {s.v}
                </span>
              ) : (
                <input
                  key={j}
                  value={vals[s.id] ?? ''}
                  onChange={(e) => setVals((v) => ({ ...v, [s.id]: e.target.value }))}
                  size={Math.max(s.answer.length, 2)}
                  spellCheck={false}
                  className={cn(
                    'nodrag mx-0.5 rounded border bg-panel px-1 text-center outline-none',
                    vals[s.id] === s.answer
                      ? 'border-good/60 text-good'
                      : 'border-edge text-ink focus:border-accent',
                  )}
                  style={{ width: `${Math.max(s.answer.length, 2) + 1}ch` }}
                />
              ),
            )}
          </div>
        ))}
      </div>
      <Meter value={done} max={blanks.length} tone={done === blanks.length ? 'good' : 'accent'} />
    </div>
  );
}

export function BlanksMode() {
  const { reference } = useCodeStudioContent();
  const { pieces } = useCodeStudioPhase();
  const resolved = pieces!;
  const [filled, setFilled] = useState<(string | null)[]>(() => resolved.map(() => null));
  const [sel, setSel] = useState<number | null>(null);
  const [wrong, setWrong] = useState<number | null>(null);
  useEffect(() => {
    setFilled(resolved.map(() => null));
    setSel(null);
  }, [reference, resolved]);

  const tray = resolved.filter((_, i) => !filled.includes(resolved[i].id));
  const place = (pieceId: string) => {
    const slot = sel ?? filled.findIndex((f) => f === null);
    if (slot < 0) return;
    if (resolved[slot].id === pieceId) {
      setFilled((f) => f.map((x, i) => (i === slot ? pieceId : x)));
      setSel(null);
    } else {
      setWrong(slot);
      window.setTimeout(() => setWrong(null), 350);
    }
  };
  const done = filled.filter(Boolean).length;

  return (
    <div className="flex flex-col gap-3 lg:flex-row">
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <Label>Skeleton</Label>
        {resolved.map((p, i) => {
          const got = filled[i];
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => setSel(i)}
              className={cn(
                'nodrag rounded-md border px-2 py-1.5 text-left transition-colors',
                got
                  ? 'border-good/60 bg-goodbg/40'
                  : sel === i
                    ? 'border-accent bg-accentbg/50'
                    : 'border-dashed border-edge bg-panel2/40 hover:border-accent/60',
                wrong === i && 'animate-pulse border-bad bg-badbg/50',
              )}
            >
              <div className="mb-0.5 flex items-center gap-1.5">
                <span className={cn('font-mono text-ink3', nodeText['2xs'])}>{i + 1}</span>
                <Chip tone={got ? 'good' : 'muted'} mono>
                  {p.role}
                </Chip>
              </div>
              {got ? (
                <Mono>{p.code}</Mono>
              ) : (
                <span className={cn('text-ink3', nodeText.xs)}>empty</span>
              )}
            </button>
          );
        })}
        <Meter
          value={done}
          max={resolved.length}
          tone={done === resolved.length ? 'good' : 'accent'}
        />
      </div>
      <div className="flex w-full shrink-0 flex-col gap-1.5 lg:w-[44%]">
        <Label>Blocks</Label>
        {tray.length === 0 ? (
          <SolvedBanner label="All blocks placed." />
        ) : (
          tray.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => place(p.id)}
              className="nodrag rounded-md border border-edge bg-panel2/50 px-2 py-1.5 text-left transition-colors hover:border-accent"
            >
              <Mono>{p.code}</Mono>
            </button>
          ))
        )}
      </div>
    </div>
  );
}

export function ParsonsMode() {
  const { reference } = useCodeStudioContent();
  const base = useMemo(() => codeLines(reference), [reference]);

  const { items, correctIds } = useMemo(() => {
    const correct = base.map((l, i) => ({
      id: `c${i}`,
      text: l.text,
      indent: l.indent,
      real: true,
    }));
    const distractors: { id: string; text: string; indent: number; real: boolean }[] = [];
    const mutate = (s: string) =>
      s.replace(/<=/, '<').replace(/>=/, '>').replace(/\+\+/, '--').replace(/\b0\b/, '1');
    for (
      let i = 0;
      i < base.length && distractors.length < 2;
      i += Math.ceil(base.length / 3) || 1
    ) {
      const m = mutate(base[i].text);
      if (m !== base[i].text)
        distractors.push({ id: `d${i}`, text: m, indent: base[i].indent, real: false });
    }
    return {
      items: shuffle([...correct, ...distractors]),
      correctIds: correct.map((c) => c.id),
    };
  }, [base]);
  const byId = useMemo(() => new Map(items.map((it) => [it.id, it])), [items]);

  const [tray, setTray] = useState<string[]>(() => items.map((it) => it.id));
  const [sol, setSol] = useState<{ id: string; indent: number }[]>([]);
  useEffect(() => {
    setTray(items.map((it) => it.id));
    setSol([]);
  }, [items]);

  const toSol = (id: string) => {
    setTray((t) => t.filter((x) => x !== id));
    setSol((s) => [...s, { id, indent: byId.get(id)!.indent }]);
  };
  const toTray = (id: string) => {
    setSol((s) => s.filter((x) => x.id !== id));
    setTray((t) => [...t, id]);
  };
  const bump = (idx: number, d: number) =>
    setSol((s) => s.map((x, i) => (i === idx ? { ...x, indent: Math.max(0, x.indent + d) } : x)));
  const moveSol = (idx: number, d: number) =>
    setSol((s) => {
      const j = idx + d;
      if (j < 0 || j >= s.length) return s;
      const n = s.slice();
      [n[idx], n[j]] = [n[j], n[idx]];
      return n;
    });

  const solved =
    sol.length === correctIds.length &&
    sol.every((x, i) => x.id === correctIds[i] && x.indent === byId.get(x.id)!.indent);

  return (
    <div className="flex flex-col gap-3 lg:flex-row">
      <div className="flex w-full shrink-0 flex-col gap-1.5 lg:w-[42%]">
        <Label>Lines</Label>
        {tray.length === 0 ? (
          <span className={cn('text-ink3', nodeText.xs)}>tray empty</span>
        ) : (
          tray.map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => toSol(id)}
              className="nodrag flex items-center gap-2 rounded-md border border-edge bg-panel2/50 px-2 py-1.5 text-left transition-colors hover:border-accent"
            >
              <ArrowRight className="h-3.5 w-3.5 shrink-0 text-ink3" />
              <Mono>{byId.get(id)!.text}</Mono>
            </button>
          ))
        )}
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <Label>Your solution</Label>
        {sol.map((x, i) => (
          <div
            key={x.id}
            className="flex items-center gap-1 rounded-md border border-edge bg-panel2/50 py-1 pr-1"
          >
            <div className="flex flex-col">
              <StepBtn dir="up" disabled={i === 0} onClick={() => moveSol(i, -1)} />
              <StepBtn dir="down" disabled={i === sol.length - 1} onClick={() => moveSol(i, 1)} />
            </div>
            <button
              type="button"
              onClick={() => bump(i, -1)}
              className="nodrag grid h-5 w-5 place-items-center rounded text-ink3 hover:bg-panel2 hover:text-ink"
            >
              <ArrowLeft className="h-3 w-3" />
            </button>
            <button
              type="button"
              onClick={() => bump(i, 1)}
              className="nodrag grid h-5 w-5 place-items-center rounded text-ink3 hover:bg-panel2 hover:text-ink"
            >
              <ArrowRight className="h-3 w-3" />
            </button>
            <div className="min-w-0 flex-1">
              <Mono indent={x.indent}>{byId.get(x.id)!.text}</Mono>
            </div>
            <button
              type="button"
              onClick={() => toTray(x.id)}
              className="nodrag grid h-5 w-5 place-items-center rounded text-ink3 hover:bg-badbg hover:text-bad"
            >
              ×
            </button>
          </div>
        ))}
        {solved && <SolvedBanner label="Correct lines, correct order, correct indentation." />}
      </div>
    </div>
  );
}

/** Hosts a registry assemble game inside Code Studio. */
export function AssembleGameHost({ id }: { id: string }) {
  const { active, code } = useCodeStudioContent();
  const { pieces } = useCodeStudioPhase();
  const { item } = useCanvasStatic();
  const game = ASSEMBLE_GAMES.find((g) => g.id === id);
  const lang = code?.lang;
  const scope = `${item.id}:${lang ?? active}`;
  const stats = useMemo(() => assembleGameStatsStore(scope), [scope]);
  if (!game) return null;
  return (
    <game.Component
      key={`${item.id}:${active}:${id}`}
      pieces={pieces!}
      lang={lang}
      storageKey={scope}
      stats={stats}
    />
  );
}
