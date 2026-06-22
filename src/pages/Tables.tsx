import { useMemo } from 'react';
import { useData } from '../app/DataProvider';
import { useNow } from '../app/providers';
import { Flag } from '../components/Flag';
import { FormGuide } from '../components/FormGuide';
import { PageHeader } from '../components/headings';
import { StandingsTable } from '../components/StandingsTable';
import { GROUP_IDS } from '../data/teams';
import { allStandings } from '../lib/standings';

export function Tables() {
  const nowMs = useNow();
  const { dataset } = useData();
  const bucket = Math.floor(nowMs / 5000);
  // biome-ignore lint/correctness/useExhaustiveDependencies: nowMs is intentionally excluded in favour of the 5s `bucket` so standings recompute every 5s, not on every 1s tick
  const standings = useMemo(
    () => allStandings(dataset.matches, dataset.teams, nowMs),
    [bucket, dataset],
  );

  return (
    <div className="shell page">
      <PageHeader
        title="Group tables"
        lede="Top two of each group advance, along with the eight best third-placed teams."
      />

      <div className="legend" aria-hidden="true">
        <span className="legend__item">
          <span className="legend__swatch legend__swatch--q" /> Through to the knockouts
        </span>
        <span className="legend__item">
          <span className="legend__swatch legend__swatch--p" /> In the best-third race
        </span>
        <span className="legend__item">
          <span className="standings__qual">Q</span> Clinched a knockout place
        </span>
      </div>

      <div className="tables-grid">
        {GROUP_IDS.map((g) => (
          <StandingsTable key={g} group={g} standings={standings.byGroup[g]} />
        ))}
      </div>

      <section className="thirds">
        <h2 className="section-label">Best third-placed teams</h2>
        <p className="thirds__lede">
          The eight highest-ranked third-placed teams join the group winners and runners-up in the
          Round of 32.
        </p>
        <ol className="thirds__list">
          {standings.bestThirds.map((s, i) => (
            <li key={s.team.code} className={`thirds__row${i < 8 ? ' is-through' : ''}`}>
              <span className="thirds__rank tnum">{i + 1}</span>
              <Flag flag={s.team.flag} crest={s.team.crest} size="sm" />
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
