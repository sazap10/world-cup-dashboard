import { useNow, useTimezone } from '../app/providers';
import type { BracketMatch } from '../lib/knockout';
import { toView } from '../lib/matches';
import { formatDayShort, formatTime } from '../lib/time';
import { BroadcasterPill } from './BroadcasterPill';
import { Flag } from './Flag';

function Slot({
  slot,
  goals,
  isWinner,
  faded,
}: {
  slot: BracketMatch['home'];
  goals: number | null;
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
      {goals !== null && <span className="tie-slot__score mono">{goals}</span>}
    </div>
  );
}

export function BracketTie({ tie }: { tie: BracketMatch }) {
  const { tz } = useTimezone();
  const nowMs = useNow();
  const { match } = tie;
  const view = toView(match, nowMs);
  const score = view.displayScore;
  // No extra-time/penalties in the data model, so a level finished score is a
  // draw with no winner highlighted (matches MatchCard's behaviour).
  const finished = view.status === 'finished';
  const homeWins = finished && score ? score.home > score.away : false;
  const awayWins = finished && score ? score.away > score.home : false;

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
          isWinner={homeWins}
          faded={awayWins}
        />
        <Slot
          slot={tie.away}
          goals={score ? score.away : null}
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
