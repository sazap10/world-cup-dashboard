import { useMemo } from 'react';
import { useData } from '../app/DataProvider';
import { useNow } from '../app/providers';
import { BracketTie } from '../components/BracketTie';
import { PageHeader } from '../components/headings';
import { buildBracket } from '../lib/knockout';

export function Knockout() {
  const nowMs = useNow();
  const { dataset } = useData();
  const bucket = Math.floor(nowMs / 5000);
  // biome-ignore lint/correctness/useExhaustiveDependencies: nowMs is intentionally excluded in favour of the 5s `bucket` so the bracket recomputes every 5s, not on every 1s tick
  const rounds = useMemo(
    () => buildBracket(dataset.matches, dataset.teams, nowMs),
    [bucket, dataset],
  );

  return (
    <div className="shell page page-knockout">
      <PageHeader
        title="Knockout bracket"
        lede="The road to the final on 19 July. Each slot fills in only once its qualifier is mathematically guaranteed — a group winner can lock in early on head-to-head, while the best third-placed teams are set only after every group is done."
        showZone
      />

      <div className="bracket-scroll">
        {/* biome-ignore lint/a11y/useSemanticElements: div/section keep the horizontal-scroll grid layout; list/listitem roles convey the structure to AT */}
        <div className="bracket" role="list">
          {rounds.map((round) => (
            // biome-ignore lint/a11y/useSemanticElements: see above — styled section with an explicit listitem role
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

      <p className="bracket-hint">
        Scroll horizontally to follow the bracket through to the final →
      </p>
    </div>
  );
}
