import type { CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { useTournament } from '../app/useTournament';
import { useTimezone } from '../app/providers';
import { groupByDay } from '../lib/matches';
import { relativeDayLabel, zoneLabelWithAbbr } from '../lib/time';
import { FeaturedMatch } from '../components/FeaturedMatch';
import { MatchCard } from '../components/MatchCard';
import { SectionLabel } from '../components/headings';
import { EmptyState } from '../components/EmptyState';

export function Home() {
  const { live, upcoming, next, nowMs } = useTournament();
  const { tz } = useTimezone();

  const featured = live[0] ?? next;
  const otherLive = live.slice(1);
  const soon = upcoming.slice(0, 18);
  const days = groupByDay(soon, tz);

  return (
    <div className="shell page page-home">
      <section className="hero" aria-labelledby="hero-label">
        <div className="hero__topline">
          <p id="hero-label" className="hero__eyebrow">
            {live.length > 0 ? 'Live now' : 'Next kickoff'}
          </p>
          <span className="hero__zone">
            All times in <strong>{zoneLabelWithAbbr(tz, nowMs)}</strong>
          </span>
        </div>

        {featured ? (
          <FeaturedMatch match={featured} />
        ) : (
          <EmptyState
            title="The tournament has finished"
            body="All 104 matches have been played. Browse the results, group tables and the road to the final."
            action={<Link className="btn btn--primary" to="/results">View results</Link>}
          />
        )}

        {otherLive.length > 0 && (
          <div className="hero__alsolive">
            <SectionLabel count={otherLive.length}>Also live</SectionLabel>
            <div className="card-grid">
              {otherLive.map((m) => (
                <MatchCard key={m.id} match={m} />
              ))}
            </div>
          </div>
        )}
      </section>

      {days.length > 0 && (
        <section className="upcoming" aria-label="Upcoming fixtures">
          <div className="upcoming__head">
            <SectionLabel>Upcoming fixtures</SectionLabel>
            <Link className="link-quiet" to="/knockout">
              Knockout bracket →
            </Link>
          </div>

          {days.map((day, di) => (
            <div className="day-group" key={day.key} style={{ '--i': di } as CSSProperties}>
              <h3 className="day-group__label">
                {relativeDayLabel(day.iso, tz, nowMs)}
                <span className="day-group__count">{day.matches.length} {day.matches.length === 1 ? 'match' : 'matches'}</span>
              </h3>
              <div className="card-grid">
                {day.matches.map((m) => (
                  <MatchCard key={m.id} match={m} />
                ))}
              </div>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
