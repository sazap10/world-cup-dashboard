import { useEffect, useState } from 'react';

interface FlagProps {
  /** Emoji flag (seed data). */
  flag?: string;
  /** Crest image URL (live data) — preferred when present. */
  crest?: string;
  size?: 'sm' | 'md' | 'lg';
}

/**
 * Team flag. Renders the live crest image when available, falling back to the
 * emoji flag (or a neutral ball) if there's no crest or the image fails to load.
 */
export function Flag({ flag, crest, size = 'md' }: FlagProps) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [crest]);

  if (crest && !failed) {
    return (
      <span className={`flag flag--${size} flag--crest`} aria-hidden="true">
        <img src={crest} alt="" loading="lazy" decoding="async" onError={() => setFailed(true)} />
      </span>
    );
  }
  return (
    <span className={`flag flag--${size}`} aria-hidden="true">
      {flag ?? '⚽'}
    </span>
  );
}
