import { useMemo, useState } from 'react';
import { useTimezone } from '../app/providers';
import { useTournament } from '../app/useTournament';
import { EmptyState } from '../components/EmptyState';
import { PageHeader } from '../components/headings';
import { MatchCard } from '../components/MatchCard';
import { GROUP_IDS } from '../data/teams';
import type { GroupId } from '../data/types';
import { groupByDay } from '../lib/matches';
import { relativeDayLabel } from '../lib/time';

type Filter = 'all' | 'group' | 'knockout' | GroupId;

export function Fixtures() {
  const { upcoming, live, nowMs } = useTournament();
  const { tz } = useTimezone();
  const [filter, setFilter] = useState<Filter>('all');

  const filtered = useMemo(() => {
    if (filter === 'all') return upcoming;
    if (filter === 'knockout') return upcoming.filter((m) => m.stage !== 'group');
    if (filter === 'group') return upcoming.filter((m) => m.stage === 'group');
    return upcoming.filter((m) => m.group === filter);
  }, [upcoming, filter]);

  // Earliest day first — chronological order for upcoming matches.
  const days = useMemo(() => groupByDay(filtered, tz), [filtered, tz]);

  return (
    <div className="shell page">
      <PageHeader
        title="Fixtures"
        lede={`${upcoming.length} matches to come${live.length ? ` · ${live.length} in progress` : ''}.`}
        showZone
      />

      {/* biome-ignore lint/a11y/useSemanticElements: a labelled group of filter controls is the correct ARIA pattern; no single semantic element fits */}
      <div className="filterbar" role="group" aria-label="Filter fixtures">
        <button
          type="button"
          className={chip(filter === 'all')}
          aria-pressed={filter === 'all'}
          onClick={() => setFilter('all')}
        >
          All
        </button>
        <button
          type="button"
          className={chip(filter === 'group')}
          aria-pressed={filter === 'group'}
          onClick={() => setFilter('group')}
        >
          Group stage
        </button>
        <button
          type="button"
          className={chip(filter === 'knockout')}
          aria-pressed={filter === 'knockout'}
          onClick={() => setFilter('knockout')}
        >
          Knockout
        </button>
        <span className="filterbar__div" aria-hidden="true" />
        {GROUP_IDS.map((g) => (
          <button
            type="button"
            key={g}
            className={chip(filter === g)}
            aria-pressed={filter === g}
            onClick={() => setFilter(g)}
          >
            {g}
          </button>
        ))}
      </div>

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

function chip(active: boolean): string {
  return `chip${active ? ' chip--active' : ''}`;
}
