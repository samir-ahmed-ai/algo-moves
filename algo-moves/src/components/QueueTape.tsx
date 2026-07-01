export interface QueueTapeProps {
  items: number[];
  label?: string;
}

export function QueueTape({ items, label = 'queue · front →' }: QueueTapeProps) {
  return (
    <div className="queue-tape">
      <span className="queue-label">{label}</span>
      {items.length === 0 ? (
        <span className="queue-empty">empty</span>
      ) : (
        <div className="queue-row">
          {items.map((n, i) => (
            <div key={i} className="queue-cell">
              {n}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
