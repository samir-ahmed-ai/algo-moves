import { cn } from '@/lib/utils/cn';
import { canSiftUp, leftChildIndex, smallerChildIndex } from '../engine/heap';
import { useHeapGame } from '../HeapGameProvider';

function TouchKey({
  label,
  onPress,
  tone = 'default',
  title,
}: {
  label: string;
  onPress: () => void;
  tone?: 'default' | 'accent' | 'muted';
  title?: string;
}) {
  return (
    <button
      type="button"
      className={cn(
        'vim-touch-key',
        tone === 'accent' && 'vim-touch-key--accent',
        tone === 'muted' && 'vim-touch-key--muted',
      )}
      onClick={onPress}
      title={title}
      aria-label={title ? `${label} — ${title}` : label}
    >
      {label}
    </button>
  );
}

export function TouchPad() {
  const { state, complete, handleKey } = useHeapGame();
  if (complete) return null;

  const { heap, phase } = state;
  let upHot = false;
  let leftHot = false;
  let rightHot = false;
  let settleHot = false;
  if (phase.kind === 'siftUp') {
    upHot = canSiftUp(heap, phase.index);
    settleHot = !upHot;
  } else if (phase.kind === 'siftDown') {
    const sc = smallerChildIndex(heap, phase.index);
    if (sc !== null && heap[sc]! < heap[phase.index]!) {
      if (sc === leftChildIndex(phase.index)) leftHot = true;
      else rightHot = true;
    } else {
      settleHot = true;
    }
  }

  return (
    <div
      className="vim-touchpad flex shrink-0 flex-col min-[960px]:hidden"
      aria-label="Touch controls"
    >
      <div className="vim-touchpad__row">
        <TouchKey
          label="u"
          tone={upHot ? 'accent' : 'default'}
          title="sift up — swap with the parent"
          onPress={() => handleKey('u')}
        />
        <TouchKey
          label="h"
          tone={leftHot ? 'accent' : 'default'}
          title="sift down — swap with the left child"
          onPress={() => handleKey('h')}
        />
        <TouchKey
          label="l"
          tone={rightHot ? 'accent' : 'default'}
          title="sift down — swap with the right child"
          onPress={() => handleKey('l')}
        />
        <TouchKey
          label="↵"
          tone={settleHot ? 'accent' : 'default'}
          title="settle — the invariant holds here"
          onPress={() => handleKey('Enter')}
        />
      </div>
      <div className="vim-touchpad__row">
        <TouchKey label="r" tone="muted" title="restart level" onPress={() => handleKey('r')} />
      </div>
      <p className="vim-touchpad__hint">u sifts up · h/l swap the smaller child · ↵ settles</p>
    </div>
  );
}
