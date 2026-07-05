import { Bookmark, BookmarkPlus, Trash2 } from 'lucide-react';

import { useCanvasFrame, Btn, EmptyState, nodeIconGlyph, Pill, Row, Section, TextInput } from '@/shell/canvas';
/** #41 Bookmarks: annotate any frame and jump back to it. */
export function BookmarksPanelBody() {
  const { player, frames } = useCanvasFrame();
  const entries = [...player.bookmarks.entries()].sort((a, b) => a[0] - b[0]);
  const marked = player.bookmarks.has(player.index);
  return (
    <div className="nodrag flex flex-col gap-2">
      <Btn
        variant={marked ? 'ghost' : 'primary'}
        size="sm"
        onClick={() => player.setBookmark(player.index, frames[player.index]?.move.note ?? '')}
        icon={<BookmarkPlus className={nodeIconGlyph} />}
        className="self-start"
      >
        {marked ? `Step ${player.index + 1} marked` : `Mark step ${player.index + 1}`}
      </Btn>
      {entries.length === 0 ? (
        <EmptyState icon={<Bookmark />} title="No bookmarks" hint="Mark a frame to annotate it and jump back." />
      ) : (
        <Section title="Bookmarks" bordered={false} right={<Pill>{entries.length}</Pill>}>
          <div className="flex flex-col">
            {entries.map(([i, note]) => (
              <Row key={i} className="items-center gap-1.5 border-t border-edge border-l-transparent py-1.5 first:border-t-0">
                <Pill active={i === player.index} onClick={() => player.goTo(i)} title="jump to frame">
                  #{i + 1}
                </Pill>
                <TextInput
                  value={note}
                  onChange={(e) => player.setBookmark(i, e.target.value)}
                  placeholder="note…"
                  className="min-w-0 flex-1 border-transparent bg-transparent px-0 py-0 focus:border-transparent"
                />
                <button
                  type="button"
                  onClick={() => player.removeBookmark(i)}
                  className="nodrag shrink-0 text-ink3 hover:text-bad"
                  aria-label="remove bookmark"
                >
                  <Trash2 className={nodeIconGlyph} />
                </button>
              </Row>
            ))}
          </div>
        </Section>
      )}
    </div>
  );
}
