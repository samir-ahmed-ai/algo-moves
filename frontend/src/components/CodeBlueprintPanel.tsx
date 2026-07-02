import type { Ref } from 'react';
import { ScanEye, X } from 'lucide-react';
import type { CodePiece } from '@/lib/code';
import { cn } from '@/lib/utils/cn';
import { CodePieceOverview } from './CodePieceOverview';

export interface CodeBlueprintPanelProps {
  pieces: CodePiece[];
  lang: string;
  wrap?: boolean;
  /** Compact in-card panel for mobile deck (not full viewport). */
  inline?: boolean;
  onClose: () => void;
  closeRef?: Ref<HTMLButtonElement>;
}

export function CodeBlueprintPanel({
  pieces,
  lang,
  wrap = false,
  inline = false,
  onClose,
  closeRef,
}: CodeBlueprintPanelProps) {
  return (
    <div
      className={cn('code-blueprint-panel code-studio-reassemble nodrag', inline && 'code-blueprint-panel--inline')}
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
      role="region"
      aria-label="Solution blueprint"
    >
      <header className="code-blueprint-header">
        <div className="code-blueprint-title-wrap">
          <ScanEye className="code-blueprint-title-icon" aria-hidden />
          <div className="min-w-0">
            <h2 className="code-blueprint-title">Solution blueprint</h2>
            {!inline && (
              <p className="code-blueprint-subtitle">
                {pieces.length} blocks · source order
              </p>
            )}
          </div>
        </div>
        <button ref={closeRef} type="button" className="code-blueprint-close" aria-label="Close blueprint" onClick={onClose}>
          <X className="h-4 w-4" />
        </button>
      </header>
      <div className="code-blueprint-body">
        <CodePieceOverview pieces={pieces} lang={lang} wrap={wrap} />
      </div>
    </div>
  );
}
