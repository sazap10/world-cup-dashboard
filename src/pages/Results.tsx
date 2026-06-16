import { useMemo, useState } from 'react';
import { useTournament } from '../app/useTournament';
import { useTimezone } from '../app/providers';
import { GROUP_IDS } from '../data/teams';
import { groupByDay } from '../lib/matches';
import { formatDayLong } from '../lib/time';
import { MatchCard } from '../components/MatchCard';
import { PageHeader } from '../components/headings';
import { EmptyState } from '../components/EmptyState';

type Filter = 'all' | 'group' | 'knockout' | string;

export function Results() {
  const { finished, live } = useTournament();
  const { tz } = useTimezone();
  const [filter, setFilter] = useState<Filter>('all');

  // Most recent first.
  const played = useMemo(
    () => [...finished].sort((a, b) => Date.parse(b.kickoff) - Date.parse(a.kickoff)),
    [finished],
  );

  const filtered = useMemo(() => {
    if (filter === 'all') return played;
    if (filter === 'knockout') return played.filter((m) => m.stage !== 'group');
    if (filter === 'group') return played.filter((m) => m.stage === 'group');
    return played.filter((m) => m.group === filter);
  }, [played, filter]);

  // Group by day, newest day first.
  const days = useMemo(() => groupByDay(filtered, tz).reverse(), [filtered, tz]);

  return (
    <div className="shell page">
      <PageHeader
        title="Results"
        lede={`${played.length} matches played${live.length ? ` · ${live.length} in progress` : ''}.`}
        showZone
      />

      <div className="filterbar" role="group" aria-label="Filter results">
        <button className={chip(filter === 'all')} onClick={() => setFilter('all')}>All</button>
        <button className={chip(filter === 'group')} onClick={() => setFilter('group')}>Group stage</button>
        <button className={chip(filter === 'knockout')} onClick={() => setFilter('knockout')}>Knockout</button>
        <span className="filterbar__div" aria-hidden="true" />
        {GROUP_IDS.map((g) => (
          <button key={g} className={chip(filter === g)} onClick={() => setFilter(g)}>
            {g}
          </button>
        ))}
      </div>

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

function chip(active: boolean): string {
  return 'chip' + (active ? ' chip--active' : '');
}
