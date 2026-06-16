interface Props {
  form: ('W' | 'D' | 'L')[];
  max?: number;
}

const FULL: Record<'W' | 'D' | 'L', string> = { W: 'Win', D: 'Draw', L: 'Loss' };

/** Recent results as W/D/L pills (letters, never colour alone). */
export function FormGuide({ form, max = 5 }: Props) {
  if (form.length === 0) {
    return (
      <span className="form-empty" role="img" aria-label="No matches played">
        —
      </span>
    );
  }
  const shown = form.slice(0, max);
  return (
    <span
      className="form-guide"
      role="img"
      aria-label={`Recent form: ${shown.map((r) => FULL[r]).join(', ')}`}
    >
      {shown.map((r, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: positional W/D/L pips never reorder and have no stable id
        <span key={i} className={`form-pip form-pip--${r.toLowerCase()}`} aria-hidden="true">
          {r}
        </span>
      ))}
    </span>
  );
}
