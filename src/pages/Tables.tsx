import { useMemo } from 'react';
import { useTournament } from '../app/useTournament';
import { allStandings } from '../lib/standings';
import { GROUP_IDS } from '../data/teams';
import { StandingsTable } from '../components/StandingsTable';
import { FormGuide } from '../components/FormGuide';
import { Flag } from '../components/Flag';
import { PageHeader } from '../components/headings';

export function Tables() {
  const { nowMs } = useTournament();
  const bucket = Math.floor(nowMs / 5000);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const standings = useMemo(() => allStandings(nowMs), [bucket]);

  return (
    <div className="shell page">
      <PageHeader
        title="Group tables"
        lede="Top two of each group advance, along with the eight best third-placed teams."
      />

      <div className="legend" aria-hidden="true">
        <span className="legend__item"><span className="legend__swatch legend__swatch--q" /> Through to the knockouts</span>
        <span className="legend__item"><span className="legend__swatch legend__swatch--p" /> In the best-third race</span>
      </div>

      <div className="tables-grid">
        {GROUP_IDS.map((g) => (
          <StandingsTable key={g} group={g} standings={standings.byGroup[g]} />
        ))}
      </div>

      <section className="thirds">
        <h2 className="section-label">Best third-placed teams</h2>
        <p className="thirds__lede">
          The eight highest-ranked third-placed teams join the group winners and
          runners-up in the Round of 32.
        </p>
        <ol className="thirds__list">
          {standings.bestThirds.map((s, i) => (
            <li key={s.team.code} className={'thirds__row' + (i < 8 ? ' is-through' : '')}>
              <span className="thirds__rank tnum">{i + 1}</span>
              <Flag flag={s.team.flag} size="sm" />
              <span className="thirds__name">{s.team.name}</span>
              <span className="thirds__group">Grp {s.team.group}</span>
              <span className="thirds__pts tnum">
                <strong>{s.points}</strong> pts
                <span className="thirds__gd">
                  {s.goalDifference > 0 ? `+${s.goalDifference}` : s.goalDifference} GD
                </span>
              </span>
              <FormGuide form={s.form} max={3} />
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
