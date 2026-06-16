import { useData } from '../app/DataProvider';
import { isFrozen } from '../lib/clock';

export function Footer() {
  const { source, error } = useData();
  const live = source === 'live';
  return (
    <footer className="footer">
      <div className="shell footer__inner">
        {live ? (
          <p>
            Live fixtures, results and standings from football-data.org. Standings are computed from
            completed matches.
          </p>
        ) : (
          <p>
            Showing built-in sample data in the official 48-team World Cup 2026 format. Add a
            football-data.org API key (see <code>.env.example</code>) to switch to live data.
            {error && <span className="footer__warn"> Live data unavailable: {error}</span>}
          </p>
        )}
        <p className="footer__meta">
          UK viewing via the BBC and ITV. Times shown in your selected timezone.
          {isFrozen() && <span className="footer__frozen"> · demo clock active</span>}
        </p>
      </div>
    </footer>
  );
}
