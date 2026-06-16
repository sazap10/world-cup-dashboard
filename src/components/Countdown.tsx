import { useNow } from '../app/providers';
import { breakdown } from '../lib/time';

interface Props {
  /** ISO kickoff to count down to. */
  target: string;
  variant?: 'hero' | 'inline';
}

/** Live countdown to kickoff. Hero shows labelled segments; inline is compact. */
export function Countdown({ target, variant = 'inline' }: Props) {
  const nowMs = useNow();
  const { days, hours, minutes, seconds } = breakdown(Date.parse(target) - nowMs);

  if (variant === 'inline') {
    const text =
      days > 0
        ? `${days}d ${hours}h`
        : hours > 0
          ? `${hours}h ${String(minutes).padStart(2, '0')}m`
          : `${minutes}m ${String(seconds).padStart(2, '0')}s`;
    return <span className="mono countdown-inline">{text}</span>;
  }

  const segs =
    days > 0
      ? [
          { v: days, l: days === 1 ? 'day' : 'days' },
          { v: hours, l: 'hrs' },
          { v: minutes, l: 'min' },
        ]
      : [
          { v: hours, l: 'hrs' },
          { v: minutes, l: 'min' },
          { v: seconds, l: 'sec' },
        ];

  return (
    <div className="countdown" role="timer" aria-label="Time until kickoff">
      {segs.map((s) => (
        <div className="countdown__seg" key={s.l}>
          <span className="countdown__num mono">{String(s.v).padStart(2, '0')}</span>
          <span className="countdown__lbl">{s.l}</span>
        </div>
      ))}
    </div>
  );
}
