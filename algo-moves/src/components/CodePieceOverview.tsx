import type { CSSProperties } from 'react';
import type { CodePiece } from '../lib/codePieces';
import { pieceRoleMeta } from '../lib/codePieceRoles';
import { HighlightedCode } from './HighlightedCode';

export interface CodePieceOverviewProps {
  pieces: CodePiece[];
  lang?: string;
  wrap?: boolean;
}

export function CodePieceOverview({ pieces, lang = 'go', wrap = false }: CodePieceOverviewProps) {
  return (
    <div className="code-overview" role="region" aria-label="Full solution overview">
      {pieces.map((piece, i) => {
        const meta = pieceRoleMeta(piece);
        const Icon = meta.icon;
        const sectionStyle = {
          '--section-stroke': meta.stroke,
          '--section-bg': meta.bg,
        } as CSSProperties;

        return (
          <section
            key={piece.id}
            className="code-overview-section"
            style={sectionStyle}
            aria-label={`Section ${i + 1}: ${piece.role}`}
          >
            <div className="code-overview-header">
              <span className="code-overview-index" style={{ color: meta.text }}>
                {i + 1}
              </span>
              <span className="code-overview-kind" style={{ color: meta.text, borderColor: meta.stroke }}>
                <Icon className="code-overview-kind-icon" aria-hidden />
                {meta.label}
              </span>
              <span className="code-overview-caption" title={piece.role}>
                {piece.role}
              </span>
            </div>
            <HighlightedCode code={piece.code} lang={lang} wrap={wrap} />
          </section>
        );
      })}
    </div>
  );
}
