import { useNow, useTimezone } from '../app/providers';
import { abbreviation, TIMEZONES } from '../lib/time';

const globe = (
  <svg
    viewBox="0 0 24 24"
    width="15"
    height="15"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <circle cx="12" cy="12" r="9" />
    <path d="M3 12h18" />
    <path d="M12 3c2.5 2.5 2.5 15.5 0 18-2.5-2.5-2.5-15.5 0-18Z" />
  </svg>
);

/** Native select styled to the system — standard, learnable, keyboard-friendly. */
export function TimezoneSelect() {
  const { tz, setTz } = useTimezone();
  const nowMs = useNow();

  return (
    <label className="tz-select" title="Show kickoff times in this timezone">
      <span className="tz-select__icon">{globe}</span>
      <span className="visually-hidden">Timezone</span>
      <select value={tz} onChange={(e) => setTz(e.target.value)}>
        {TIMEZONES.map((t) => {
          const abbr = abbreviation(t.id, nowMs);
          return (
            <option key={t.id} value={t.id}>
              {t.label}
              {abbr ? ` · ${abbr}` : ''}
            </option>
          );
        })}
      </select>
      <span className="tz-select__chev" aria-hidden="true">
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          width="14"
          height="14"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </span>
    </label>
  );
}
