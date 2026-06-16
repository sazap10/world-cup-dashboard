import { isFrozen } from '../lib/clock';

export function Footer() {
  return (
    <footer className="footer">
      <div className="shell footer__inner">
        <p>
          Fixtures, results and standings are illustrative seed data in the official
          48-team World Cup 2026 format, not live results.
        </p>
        <p className="footer__meta">
          UK viewing via the BBC and ITV. Times shown in your selected timezone.
          {isFrozen() && <span className="footer__frozen"> · demo clock active</span>}
        </p>
      </div>
    </footer>
  );
}
