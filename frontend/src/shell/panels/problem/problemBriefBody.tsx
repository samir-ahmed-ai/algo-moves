import { cn } from '@/lib/utils/cn';
import { nodeText } from '@/shell/canvas';

function InfoParagraphs({ lines }: { lines: string[] }) {
  return (
    <>
      {lines.map((line) => (
        <p key={line} className={cn('leading-relaxed text-ink2', nodeText.sm)}>
          {line}
        </p>
      ))}
    </>
  );
}

export function ProblemBriefBody({ statements }: { statements: string[] }) {
  if (statements.length === 0) return null;
  return (
    <div className="space-y-1">
      <InfoParagraphs lines={statements} />
    </div>
  );
}
