import { useMemo, useState } from 'react';
import { useTimezone } from '../app/providers';
import { useTournament } from '../app/useTournament';
import { EmptyState } from '../components/EmptyState';
import { PageHeader } from '../components/headings';
import { MatchCard } from '../components/MatchCard';
import { filterMatches, type MatchFilter, MatchFilterBar } from '../components/MatchFilterBar';
import { groupByDay } from '../lib/matches';
import { relativeDayLabel } from '../lib/time';

export function Fixtures() {
  const { upcoming, live, nowMs } = useTournament();
  const { tz } = useTimezone();
  const [filter, setFilter] = useState<MatchFilter>('all');
  const [team, setTeam] = useState('');

  const filtered = useMemo(() => filterMatches(upcoming, filter, team), [upcoming, filter, team]);

  // Earliest day first — chronological order for upcoming matches.
  const days = useMemo(() => groupByDay(filtered, tz), [filtered, tz]);

  return (
    <div className="shell page">
      <PageHeader
        title="Fixtures"
        lede={`${upcoming.length} matches to come${live.length ? ` · ${live.length} in progress` : ''}.`}
        showZone
      />

      <MatchFilterBar
        matches={upcoming}
        filter={filter}
        team={team}
        onFilter={setFilter}
        onTeam={setTeam}
        label="Filter fixtures"
      />

      {days.length === 0 ? (
        <EmptyState
          title="No upcoming fixtures"
          body={
            live.length > 0
              ? 'Every remaining match in this view is underway. Follow them live on the home page.'
              : 'Every match in this view has kicked off. Check the results for full-time scores.'
          }
        />
      ) : (
        days.map((day) => (
          <section className="day-group" key={day.key}>
            <h2 className="day-group__label">
              {relativeDayLabel(day.iso, tz, nowMs)}
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
