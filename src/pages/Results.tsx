import { useMemo, useState } from 'react';
import { useTimezone } from '../app/providers';
import { useTournament } from '../app/useTournament';
import { EmptyState } from '../components/EmptyState';
import { PageHeader } from '../components/headings';
import { MatchCard } from '../components/MatchCard';
import { filterMatches, type MatchFilter, MatchFilterBar } from '../components/MatchFilterBar';
import { groupByDay } from '../lib/matches';
import { formatDayLong } from '../lib/time';

export function Results() {
  const { finished, live } = useTournament();
  const { tz } = useTimezone();
  const [filter, setFilter] = useState<MatchFilter>('all');
  const [team, setTeam] = useState('');

  // Most recent first.
  const played = useMemo(
    () => [...finished].sort((a, b) => Date.parse(b.kickoff) - Date.parse(a.kickoff)),
    [finished],
  );

  const filtered = useMemo(() => filterMatches(played, filter, team), [played, filter, team]);

  // Group by day, newest day first.
  const days = useMemo(() => groupByDay(filtered, tz).reverse(), [filtered, tz]);

  return (
    <div className="shell page">
      <PageHeader
        title="Results"
        lede={`${played.length} matches played${live.length ? ` · ${live.length} in progress` : ''}.`}
        showZone
      />

      <MatchFilterBar
        matches={played}
        filter={filter}
        team={team}
        onFilter={setFilter}
        onTeam={setTeam}
        label="Filter results"
      />

      {days.length === 0 ? (
        <EmptyState
          title="No results yet"
          body="Once matches kick off and reach full time, they'll appear here, newest first."
        />
      ) : (
        days.map((day) => (
          <section className="day-group" key={day.key}>
            <h2 className="day-group__label">
              {formatDayLong(day.iso, tz)}
              <span className="day-group__count">{day.matches.length}</span>
            </h2>
            <div className="card-grid">
              {day.matches.map((m) => (
                <MatchCard key={m.id} match={m} />
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  );
}
