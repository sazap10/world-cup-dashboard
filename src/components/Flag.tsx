interface FlagProps {
  flag: string;
  size?: 'sm' | 'md' | 'lg';
}

/** Emoji flag. Decorative — the team name carries the meaning for screen readers. */
export function Flag({ flag, size = 'md' }: FlagProps) {
  return (
    <span className={`flag flag--${size}`} aria-hidden="true">
      {flag}
    </span>
  );
}
