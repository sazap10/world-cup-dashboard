import { useMemo } from 'react';
import { GROUP_IDS, TEAMS_BY_CODE } from '../data/teams';
import type { GroupId, MatchView } from '../data/types';

export type MatchFilter = 'all' | 'group' | 'knockout' | GroupId;

/** Apply the stage/group chip selection and the team dropdown (they AND together). */
export function filterMatches(
  matches: MatchView[],
  filter: MatchFilter,
  team: string,
): MatchView[] {
  let list = matches;
  if (filter === 'knockout') list = list.filter((m) => m.stage !== 'group');
  else if (filter === 'group') list = list.filter((m) => m.stage === 'group');
  else if (filter !== 'all') list = list.filter((m) => m.group === filter);
  if (team) list = list.filter((m) => m.home === team || m.away === team);
  return list;
}

const shirt = (
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
    <path d="M4 6 8 3h8l4 3-3 3-2-1.5V21H7V7.5L5 9 4 6Z" />
  </svg>
);

interface Props {
  /** Source matches used to derive which teams appear in the dropdown. */
  matches: MatchView[];
  filter: MatchFilter;
  team: string;
  onFilter: (filter: MatchFilter) => void;
  onTeam: (code: string) => void;
  /** aria-label for the control group, e.g. "Filter fixtures". */
  label: string;
}

/** Stage/group chips plus a team dropdown, shared by Fixtures and Results. */
export function MatchFilterBar({ matches, filter, team, onFilter, onTeam, label }: Props) {
  // Teams with at least one match in this view, alphabetised — knockout
  // placeholder slots ("1A", "W73") aren't real codes, so they fall away.
  const teamOptions = useMemo(() => {
    const codes = new Set<string>();
    for (const m of matches) {
      if (TEAMS_BY_CODE[m.home]) codes.add(m.home);
      if (TEAMS_BY_CODE[m.away]) codes.add(m.away);
    }
    return [...codes].map((c) => TEAMS_BY_CODE[c]).sort((a, b) => a.name.localeCompare(b.name));
  }, [matches]);

  return (
    // biome-ignore lint/a11y/useSemanticElements: a labelled group of filter controls is the correct ARIA pattern; no single semantic element fits
    <div className="filterbar" role="group" aria-label={label}>
      <button
        type="button"
        className={chip(filter === 'all')}
        aria-pressed={filter === 'all'}
        onClick={() => onFilter('all')}
      >
        All
      </button>
      <button
        type="button"
        className={chip(filter === 'group')}
        aria-pressed={filter === 'group'}
        onClick={() => onFilter('group')}
      >
        Group stage
      </button>
      <button
        type="button"
        className={chip(filter === 'knockout')}
        aria-pressed={filter === 'knockout'}
        onClick={() => onFilter('knockout')}
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
          onClick={() => onFilter(g)}
        >
          {g}
        </button>
      ))}
      {teamOptions.length > 0 && (
        <>
          <span className="filterbar__div" aria-hidden="true" />
          <label className="tz-select" title="Show only this team's matches">
            <span className="tz-select__icon">{shirt}</span>
            <span className="visually-hidden">Team</span>
            <select value={team} onChange={(e) => onTeam(e.target.value)}>
              <option value="">All teams</option>
              {teamOptions.map((t) => (
                <option key={t.code} value={t.code}>
                  {t.flag ? `${t.flag} ` : ''}
                  {t.name}
                </option>
              ))}
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
        </>
      )}
    </div>
  );
}

function chip(active: boolean): string {
  return `chip${active ? ' chip--active' : ''}`;
}
