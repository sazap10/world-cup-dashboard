import { useMemo } from 'react';
import { useNow } from '../app/providers';
import { useData } from '../app/DataProvider';
import { buildBracket } from '../lib/knockout';
import { BracketTie } from '../components/BracketTie';
import { PageHeader } from '../components/headings';

export function Knockout() {
  const nowMs = useNow();
  const { dataset } = useData();
  const bucket = Math.floor(nowMs / 5000);
  const rounds = useMemo(
    () => buildBracket(dataset.matches, dataset.teams, nowMs),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [bucket, dataset],
  );

  return (
    <div className="shell page page-knockout">
      <PageHeader
        title="Knockout bracket"
        lede="The road to the final on 19 July. Seedings shown are provisional until each group is decided (≈)."
        showZone
      />

      <div className="bracket-scroll">
        <div className="bracket" role="list">
          {rounds.map((round) => (
            <section
              className={`bracket-col bracket-col--${round.stage}`}
              key={round.stage}
              role="listitem"
              aria-label={round.label}
            >
              <h2 className="bracket-col__label">{round.label}</h2>
              <div className="bracket-col__ties">
                {round.matches.map((tie) => (
                  <BracketTie key={tie.match.id} tie={tie} />
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>

      <p className="bracket-hint">Scroll horizontally to follow the bracket through to the final →</p>
    </div>
  );
}
