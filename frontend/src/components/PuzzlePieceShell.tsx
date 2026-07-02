import type { CSSProperties } from 'react';
import type { CodePiece } from '../lib/codePieces';
import { pieceRoleMeta } from '../lib/codePieceRoles';
import { dedentForDisplay } from '../lib/trayLayout';
import { cn } from '../lib/cn';
import { HighlightedCode } from './HighlightedCode';

export interface PuzzlePieceShellProps {
  piece: CodePiece;
  lang?: string;
  wrap?: boolean;
  mode?: 'tray' | 'placed' | 'ghost';
  className?: string;
}

/** Puzzle-shaped shell around syntax-colored code for the reassemble drill. */
export function PuzzlePieceShell({ piece, lang = 'go', wrap = false, mode = 'tray', className }: PuzzlePieceShellProps) {
  const meta = pieceRoleMeta(piece);
  const display = dedentForDisplay(piece.code);

  return (
    <div
      className={cn('blk', meta.shape, `puzzle-piece--${mode}`, className)}
      style={{ '--blk-stroke': meta.stroke } as CSSProperties}
    >
      <div className="blk-face">
        <HighlightedCode code={display} lang={lang} wrap={wrap} gutter={false} />
      </div>
    </div>
  );
}
