import type { CSSProperties } from 'react';

type Props = { value: number; label: string };

export function ProgressRing({ value, label }: Props) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div className="progress-ring" style={{ '--progress': `${clamped * 3.6}deg` } as CSSProperties}>
      <div>
        <strong>{clamped}%</strong>
        <span>{label}</span>
      </div>
    </div>
  );
}
