import { useNow, useTimezone } from '../app/providers';
import type { BracketMatch } from '../lib/knockout';
import { toView } from '../lib/matches';
import { formatDayShort, formatTime } from '../lib/time';
import { BroadcasterPill } from './BroadcasterPill';
import { Flag } from './Flag';

function Slot({
  slot,
  goals,
  pens,
  isWinner,
  faded,
}: {
  slot: BracketMatch['home'];
  goals: number | null;
  pens: number | null;
  isWinner: boolean;
  faded: boolean;
}) {
  const team = slot.team;
  return (
    <div
      className={
        'tie-slot' +
        (team ? '' : ' tie-slot--empty') +
        (isWinner ? ' tie-slot--winner' : '') +
        (faded ? ' tie-slot--faded' : '')
      }
    >
      {team ? (
        <Flag flag={team.flag} crest={team.crest} size="sm" />
      ) : (
        <span className="flag flag--sm flag--slot" aria-hidden="true" />
      )}
      <span className="tie-slot__name">{team ? team.name : slot.label}</span>
      {goals !== null && (
        <span className="tie-slot__score mono">
          {goals}
          {pens !== null && <span className="tie-slot__pens">({pens})</span>}
        </span>
      )}
    </div>
  );
}

export function BracketTie({ tie }: { tie: BracketMatch }) {
  const { tz } = useTimezone();
  const nowMs = useNow();
  const { match } = tie;
  const view = toView(match, nowMs);
  const score = view.displayScore;
  const pens = view.displayPenalties;
  // Winner is the higher score, or — on a level finished tie — the side that won
  // the penalty shootout. A level score with no penalties stays a draw.
  const finished = view.status === 'finished';
  const homeWins =
    finished && score
      ? score.home > score.away || (score.home === score.away && !!pens && pens.home > pens.away)
      : false;
  const awayWins =
    finished && score
      ? score.away > score.home || (score.home === score.away && !!pens && pens.away > pens.home)
      : false;

  return (
    <article className={`tie tie--${view.status}`}>
      <div className="tie__meta">
        {view.status === 'live' ? (
          <span className="status-live">
            <span className="live-dot" aria-hidden="true" />
            LIVE
            <span className="status-live__min mono">{view.minuteLabel}</span>
          </span>
        ) : view.status === 'finished' ? (
          <span className="status-ft">Full time</span>
        ) : (
          <span className="tie__date">
            {formatDayShort(match.kickoff, tz)} ·{' '}
            <span className="mono">{formatTime(match.kickoff, tz)}</span>
          </span>
        )}
        <span className="tie__id">{match.id.replace('K-', '')}</span>
      </div>
      <div className="tie__slots">
        <Slot
          slot={tie.home}
          goals={score ? score.home : null}
          pens={pens ? pens.home : null}
          isWinner={homeWins}
          faded={awayWins}
        />
        <Slot
          slot={tie.away}
          goals={score ? score.away : null}
          pens={pens ? pens.away : null}
          isWinner={awayWins}
          faded={homeWins}
        />
      </div>
      <div className="tie__foot">
        <BroadcasterPill broadcaster={match.broadcaster} variant="tag" />
      </div>
    </article>
  );
}
