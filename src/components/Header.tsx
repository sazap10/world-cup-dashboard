import { Link } from 'react-router-dom';
import { useData } from '../app/DataProvider';
import { useTournament } from '../app/useTournament';
import { NavTabs } from './Nav';
import { ThemeToggle } from './ThemeToggle';
import { TimezoneSelect } from './TimezoneSelect';

function Wordmark() {
  return (
    <Link to="/" className="wordmark" aria-label="World Cup 2026 dashboard, home">
      <span className="wordmark__glyph" aria-hidden="true">
        <svg viewBox="0 0 32 32" width="30" height="30" aria-hidden="true">
          <circle cx="16" cy="16" r="13" fill="none" stroke="var(--accent)" strokeWidth="2" />
          <path d="M16 7.5l3.4 2.5-1.3 4h-4.2l-1.3-4z" fill="var(--accent)" />
          <path d="M16 16h4.2l1.3 4L16 23.5 10.5 20l1.3-4z" fill="var(--primary)" />
        </svg>
      </span>
      <span className="wordmark__text">
        <strong>World&nbsp;Cup</strong>
        <span>2026</span>
      </span>
    </Link>
  );
}

function LiveTicker() {
  const { live } = useTournament();
  if (live.length === 0) return null;
  return (
    <Link to="/" className="live-ticker" aria-label={`${live.length} matches live now`}>
      <span className="live-dot" aria-hidden="true" />
      <span className="live-ticker__count">{live.length}</span>
      <span className="live-ticker__label">live now</span>
    </Link>
  );
}

function DataSourceBadge() {
  const { source, refreshing } = useData();
  const live = source === 'live';
  const label = live ? 'Live data' : 'Sample data';
  const explanation = live
    ? 'Showing live data from football-data.org.'
    : 'Showing built-in sample data. Add a football-data.org API key to go live.';
  return (
    <>
      {/* Explanation lives in a popover (keyboard- and touch-reachable), not a
          title tooltip; the dot stays visible on mobile so the data-source
          state is never fully hidden. */}
      <button
        type="button"
        className={`src-badge${live ? ' src-badge--live' : ''}`}
        popoverTarget="src-badge-info"
        aria-label={`Data source: ${label}. ${explanation}`}
      >
        <span
          className={`src-badge__dot${refreshing ? ' is-refreshing' : ''}`}
          aria-hidden="true"
        />
        <span className="src-badge__text">{label}</span>
      </button>
      <div id="src-badge-info" popover="auto" role="tooltip" className="src-badge__pop">
        {explanation}
      </div>
    </>
  );
}

export function Header() {
  return (
    <header className="header">
      <div className="shell header__bar">
        <div className="header__left">
          <Wordmark />
          <LiveTicker />
        </div>
        <div className="header__right">
          <DataSourceBadge />
          <TimezoneSelect />
          <ThemeToggle />
        </div>
      </div>
      <div className="header__nav">
        <div className="shell">
          <NavTabs />
        </div>
      </div>
    </header>
  );
}
