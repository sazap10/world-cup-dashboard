import type { Broadcaster } from '../data/types';

const playIcon = (
  <svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor" aria-hidden="true">
    <path d="M8 5.5v13l11-6.5z" />
  </svg>
);

interface Props {
  broadcaster: Broadcaster;
  /** "watch" = call-to-action link; "tag" = compact label only. */
  variant?: 'watch' | 'tag';
}

/** Where to watch in the UK, linking out to the streaming service. */
export function BroadcasterPill({ broadcaster: b, variant = 'watch' }: Props) {
  if (!b) return null;

  if (variant === 'tag') {
    return (
      <span className="bcast bcast--tag">
        {playIcon}
        {b.channel}
      </span>
    );
  }

  return (
    <a
      className="bcast bcast--watch"
      href={b.watchUrl}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => e.stopPropagation()}
    >
      {playIcon}
      <span className="bcast__channel">{b.channel}</span>
      <span className="bcast__svc">Watch on {b.streaming}</span>
      <svg
        className="bcast__ext"
        viewBox="0 0 24 24"
        width="12"
        height="12"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M7 17 17 7" />
        <path d="M9 7h8v8" />
      </svg>
    </a>
  );
}
