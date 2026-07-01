import {
  Bookmark,
  BookmarkPlus,
  Gauge,
  ListOrdered,
  Pause,
  Play,
  Repeat,
  Rewind,
  RotateCcw,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { useWorkspace } from '../../../../lib/workspace';
import { cn } from '../../../../lib/cn';
import { CHROME_BTN } from '../../../chrome';
import { useCanvasFrame } from '../../CanvasContext';
import { nodeIconGlyph, nodeText, RADIUS_CTRL } from '../../nodeui';

const SPEEDS = [0.25, 0.5, 1, 1.5, 2, 4];

export function Transport() {
  const { player, frame } = useCanvasFrame();
  const { tweaks, toggleTweak } = useWorkspace();
  const bookmarked = player.bookmarks.has(player.index);
  const toggleBookmark = () => {
    if (bookmarked) player.removeBookmark(player.index);
    else player.setBookmark(player.index, frame.move.note);
  };
  const btn =
    `nodrag grid ${CHROME_BTN} place-items-center p-1 text-ink2 transition-colors enabled:hover:bg-panel2 enabled:hover:text-ink disabled:opacity-30 ${RADIUS_CTRL}`;
  const { loopStart, loopEnd } = player;
  const looping = loopStart !== null || loopEnd !== null;

  const setA = () => {
    player.setLoopStart(player.index);
    if (loopEnd !== null && loopEnd < player.index) player.setLoopEnd(null);
  };
  const setB = () => {
    player.setLoopEnd(player.index);
    if (loopStart !== null && loopStart > player.index) player.setLoopStart(null);
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-1">
        <button onClick={player.prev} disabled={player.index === 0} className={btn} aria-label="previous move">
          <SkipBack className={nodeIconGlyph} />
        </button>
        <button
          onClick={player.toggleReverse}
          className={cn(
            `nodrag grid ${CHROME_BTN} place-items-center p-1 transition-colors enabled:hover:bg-panel2 ${RADIUS_CTRL}`,
            player.reversed ? 'text-accent' : 'text-ink2 hover:text-ink',
          )}
          title={player.reversed ? 'playing backward' : 'play backward'}
          aria-label="toggle reverse playback"
        >
          <Rewind className={nodeIconGlyph} />
        </button>
        <button
          onClick={player.togglePlay}
          className={cn(
            `nodrag grid ${CHROME_BTN} place-items-center p-1 transition-colors ${RADIUS_CTRL}`,
            player.isPlaying ? 'text-ink3 hover:bg-panel2 hover:text-ink' : 'bg-accent text-ink',
          )}
          aria-label={player.isPlaying ? 'pause' : 'play'}
        >
          {player.isPlaying ? <Pause className={nodeIconGlyph} /> : <Play className={nodeIconGlyph} />}
        </button>
        <button
          onClick={player.next}
          disabled={player.index === player.total - 1}
          className={btn}
          aria-label="next move"
        >
          <SkipForward className={nodeIconGlyph} />
        </button>
        <button onClick={player.reset} className={btn} aria-label="reset">
          <RotateCcw className={nodeIconGlyph} />
        </button>
        <span className={cn('ml-1 font-mono text-ink3', nodeText.xs)}>
          {player.index + 1}/{player.total}
        </span>
        <div className="flex-1" />
        <button
          onClick={toggleBookmark}
          className={cn(
            `nodrag grid ${CHROME_BTN} place-items-center p-1 transition-colors hover:bg-panel2 ${RADIUS_CTRL}`,
            bookmarked ? 'text-accent' : 'text-ink3',
          )}
          title={bookmarked ? 'remove bookmark' : 'bookmark this frame'}
          aria-label="toggle bookmark"
        >
          {bookmarked ? <Bookmark className={cn(nodeIconGlyph, 'fill-current')} /> : <BookmarkPlus className={nodeIconGlyph} />}
        </button>
        <button
          onClick={() => toggleTweak('narrate')}
          className={cn(
            `nodrag grid ${CHROME_BTN} place-items-center p-1 transition-colors hover:bg-panel2 ${RADIUS_CTRL}`,
            tweaks.narrate ? 'text-accent' : 'text-ink3',
          )}
          title={tweaks.narrate ? 'mute narration' : 'narrate captions'}
          aria-label="toggle narration"
        >
          {tweaks.narrate ? <Volume2 className={nodeIconGlyph} /> : <VolumeX className={nodeIconGlyph} />}
        </button>
        <button
          onClick={() => toggleTweak('moveLog')}
          className={cn(
            `nodrag grid ${CHROME_BTN} place-items-center p-1 transition-colors hover:bg-panel2 ${RADIUS_CTRL}`,
            tweaks.moveLog ? 'text-accent' : 'text-ink3',
          )}
          title={tweaks.moveLog ? 'hide moves' : 'show moves'}
          aria-label="toggle moves"
        >
          <ListOrdered className={nodeIconGlyph} />
        </button>
      </div>

      <input
        type="range"
        min={0}
        max={Math.max(player.total - 1, 0)}
        value={player.index}
        onChange={(e) => player.goTo(Number(e.target.value))}
        className="nodrag h-1.5 w-full cursor-pointer appearance-none rounded-full bg-panel2 accent-[var(--accent)]"
        aria-label="scrubber"
      />

      <div className="flex items-center gap-1.5">
        <Gauge className={cn(nodeIconGlyph, 'text-ink3')} />
        <select
          value={player.speed}
          onChange={(e) => player.setSpeed(Number(e.target.value))}
          className={cn(
            `nodrag border border-edge bg-panel2 px-1 py-0.5 text-ink outline-none focus:border-accent ${RADIUS_CTRL}`,
            nodeText.xs,
          )}
          aria-label="playback speed"
        >
          {SPEEDS.map((s) => (
            <option key={s} value={s}>
              {s}×
            </option>
          ))}
        </select>
        <div className="flex-1" />
        <Repeat className={cn(nodeIconGlyph, looping ? 'text-accent' : 'text-ink3')} />
        <button
          onClick={setA}
          className={cn(`nodrag px-1 py-0.5 text-ink2 hover:bg-panel2 ${RADIUS_CTRL}`, nodeText.xs)}
          title="set loop start (A)"
        >
          A{loopStart !== null ? `:${loopStart + 1}` : ''}
        </button>
        <button
          onClick={setB}
          className={cn(`nodrag px-1 py-0.5 text-ink2 hover:bg-panel2 ${RADIUS_CTRL}`, nodeText.xs)}
          title="set loop end (B)"
        >
          B{loopEnd !== null ? `:${loopEnd + 1}` : ''}
        </button>
        {looping && (
          <button
            onClick={player.clearLoop}
            className={cn(`nodrag px-1 py-0.5 text-bad hover:bg-badbg ${RADIUS_CTRL}`, nodeText.xs)}
            title="clear loop"
          >
            ✕
          </button>
        )}
      </div>
    </div>
  );
}
