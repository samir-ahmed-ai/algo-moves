import type { CSSProperties } from 'react';
import type { CodePiece } from '@/lib/code';
import { pieceGlyph, pieceRoleMeta } from '@/lib/code';
import { dedentForDisplay } from '@/lib/code';
import { cn } from '@/lib/utils/cn';
import { HighlightedCode } from '../code/HighlightedCode';

export interface CodePieceOverviewProps {
  pieces: CodePiece[];
  lang?: string;
  wrap?: boolean;
}

export function CodePieceOverview({ pieces, lang = 'go', wrap = false }: CodePieceOverviewProps) {
  return (
    <div
      className={cn('code-overview', wrap && 'code-overview--wrap')}
      role="region"
      aria-label="Full solution overview"
    >
      {pieces.map((piece, i) => {
        const meta = pieceRoleMeta(piece);
        const glyph = pieceGlyph(piece, meta.kind);
        const sectionStyle = {
          '--section-stroke': meta.stroke,
          '--section-bg': meta.bg,
          '--section-text': meta.text,
        } as CSSProperties;

        return (
          <section
            key={piece.id}
            className="code-overview-section"
            style={sectionStyle}
            aria-label={`Section ${i + 1} of ${pieces.length}: ${piece.role}`}
          >
            <div className="code-overview-code">
              <span className="code-overview-index" aria-hidden>
                {i + 1}
              </span>
              <HighlightedCode
                code={dedentForDisplay(piece.code)}
                lang={lang}
                wrap={wrap}
                className="code-overview-snippet"
              />
            </div>
            <aside className="code-overview-aside" aria-label={piece.role}>
              <span className="code-overview-glyph" aria-hidden>
                {glyph}
              </span>
              <span className="code-overview-kind">{meta.label}</span>
              <p className="code-overview-caption">{piece.role}</p>
            </aside>
          </section>
        );
      })}
    </div>
  );
}
