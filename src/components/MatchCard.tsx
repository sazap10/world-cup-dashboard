import { useTeam } from '../app/DataProvider';
import { useNow, useTimezone } from '../app/providers';
import type { MatchView } from '../data/types';
import { prettySlot } from '../lib/knockout';
import { formatTime, relativeDayLabel } from '../lib/time';
import { BroadcasterPill } from './BroadcasterPill';
import { Countdown } from './Countdown';
import { Flag } from './Flag';

interface TeamSide {
  code: string;
  goals: number | null;
  pens: number | null;
  isWinner: boolean;
  faded: boolean;
}

function TeamRow({ side }: { side: TeamSide }) {
  const team = useTeam(side.code);
  return (
    <div
      className={
        'team-row' +
        (side.isWinner ? ' team-row--winner' : '') +
        (side.faded ? ' team-row--faded' : '')
      }
    >
      {team ? (
        <Flag flag={team.flag} crest={team.crest} />
      ) : (
        <span className="flag flag--md flag--slot" aria-hidden="true" />
      )}
      <span className="team-row__name">{team ? team.name : prettySlot(side.code)}</span>
      {side.goals !== null && (
        <span className="team-row__score mono">
          {side.goals}
          {side.pens !== null && <span className="team-row__pens">({side.pens})</span>}
        </span>
      )}
    </div>
  );
}

interface Props {
  match: MatchView;
  showRound?: boolean;
}

export function MatchCard({ match, showRound = true }: Props) {
  const { tz } = useTimezone();
  const nowMs = useNow();

  const venue = match.venue;
  const score = match.displayScore;
  const pens = match.displayPenalties;
  const homeGoals = score ? score.home : null;
  const awayGoals = score ? score.away : null;
  const finished = match.status === 'finished';

  // A level finished tie is settled on penalties when present; otherwise a draw.
  const homeWins =
    finished && score
      ? score.home > score.away || (score.home === score.away && !!pens && pens.home > pens.away)
      : false;
  const awayWins =
    finished && score
      ? score.away > score.home || (score.home === score.away && !!pens && pens.away > pens.home)
      : false;

  const startsSoon =
    match.status === 'upcoming' && Date.parse(match.kickoff) - nowMs < 48 * 3600_000;

  return (
    <article className={`match-card match-card--${match.status}`}>
      <div className="match-card__top">
        {showRound && <span className="match-card__round">{match.roundLabel}</span>}
        <span className="match-card__status">
          {match.status === 'live' && (
            <span className="status-live">
              <span className="live-dot" aria-hidden="true" />
              LIVE
              <span className="status-live__min mono">{match.minuteLabel}</span>
            </span>
          )}
          {match.status === 'finished' && <span className="status-ft">Full time</span>}
          {match.status === 'upcoming' && (
            <span className="status-upcoming">
              <span className="status-upcoming__day">
                {relativeDayLabel(match.kickoff, tz, nowMs)}
              </span>
              <time className="status-upcoming__time mono" dateTime={match.kickoff}>
                {formatTime(match.kickoff, tz)}
              </time>
            </span>
          )}
        </span>
      </div>

      <div className="match-card__teams">
        <TeamRow
          side={{
            code: match.home,
            goals: homeGoals,
            pens: pens ? pens.home : null,
            isWinner: homeWins,
            faded: awayWins,
          }}
        />
        <TeamRow
          side={{
            code: match.away,
            goals: awayGoals,
            pens: pens ? pens.away : null,
            isWinner: awayWins,
            faded: homeWins,
          }}
        />
      </div>

      <div className="match-card__foot">
        <span className="match-card__venue">
          <svg
            viewBox="0 0 24 24"
            width="13"
            height="13"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M12 21s7-5.5 7-11a7 7 0 1 0-14 0c0 5.5 7 11 7 11Z" />
            <circle cx="12" cy="10" r="2.5" />
          </svg>
          {venue ? [venue.stadium, venue.city].filter(Boolean).join(', ') : 'Venue TBC'}
        </span>
        <div className="match-card__watch">
          {startsSoon && <Countdown target={match.kickoff} />}
          <BroadcasterPill broadcaster={match.broadcaster} variant="watch" />
        </div>
      </div>
    </article>
  );
}
