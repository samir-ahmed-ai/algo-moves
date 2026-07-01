import { VimKbd } from './vimUi';

/** Mini preview for landing promo — matches Vim Dojo glass card styling. */
export function VimHeroPreview() {
  const grid = [
    ['#', '#', '#', '#', '#'],
    ['#', '.', '.', '.', '#'],
    ['#', '#', '.', '#', '#'],
    ['#', '.', '.', '★', '#'],
    ['#', '#', '#', '#', '#'],
  ];

  return (
    <div className="vim-hero-preview flex w-[7.5rem] shrink-0 overflow-hidden rounded-[var(--radius)] border border-edge/80 bg-panel/90 backdrop-blur-md sm:w-[8.5rem]">
      <div className="w-[3px] shrink-0 bg-accent" aria-hidden />
      <div className="min-w-0 flex-1 p-2">
        <div className="mb-1 font-mono text-[8px] font-semibold text-accent">-- NORMAL --</div>
        <div
          className="grid gap-px font-mono text-[10px]"
          style={{ gridTemplateColumns: 'repeat(5, 1.25rem)' }}
          aria-hidden
        >
          {grid.flatMap((row, r) =>
            row.map((cell, c) => {
              const isCursor = r === 1 && c === 1;
              const isGoal = cell === '★';
              return (
                <div
                  key={`${r}-${c}`}
                  className={`grid h-5 w-5 place-items-center rounded-sm ${
                    cell === '#' ? 'bg-panel2' : 'bg-accentbg/40'
                  } ${isCursor ? 'vim-hero-preview-cursor text-accent' : 'text-ink'}`}
                >
                  {isCursor ? '█' : isGoal ? '★' : ''}
                </div>
              );
            }),
          )}
        </div>
        <div className="mt-1.5 flex gap-1">
          {['h', 'j', 'k', 'l'].map((k) => (
            <VimKbd key={k} className="px-1 text-[8px]">
              {k}
            </VimKbd>
          ))}
        </div>
      </div>
    </div>
  );
}
