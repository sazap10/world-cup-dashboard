import type { MatchView } from '../data/types';
import { prettySlot } from '../lib/knockout';
import { formatTime, relativeDayLabel } from '../lib/time';
import { useNow, useTimezone } from '../app/providers';
import { useTeam } from '../app/DataProvider';
import { Flag } from './Flag';
import { BroadcasterPill } from './BroadcasterPill';
import { Countdown } from './Countdown';

function BigTeam({ code, align }: { code: string; align: 'start' | 'end' }) {
  const team = useTeam(code);
  return (
    <div className={`big-team big-team--${align}`}>
      {team ? (
        <Flag flag={team.flag} crest={team.crest} size="lg" />
      ) : (
        <span className="flag flag--lg flag--slot" aria-hidden="true" />
      )}
      <span className="big-team__name">{team ? team.name : prettySlot(code)}</span>
    </div>
  );
}

export function FeaturedMatch({ match }: { match: MatchView }) {
  const { tz } = useTimezone();
  const nowMs = useNow();
  const venue = match.venue;
  const score = match.displayScore;
  const isLive = match.status === 'live';

  return (
    <article className={`featured featured--${match.status}`}>
      <div className="featured__head">
        <span className="featured__round">{match.roundLabel}</span>
        {isLive ? (
          <span className="status-live status-live--lg">
            <span className="live-dot" aria-hidden="true" />
            LIVE
            <span className="status-live__min mono">{match.minute}&rsquo;</span>
          </span>
        ) : match.status === 'finished' ? (
          <span className="status-ft">Full time</span>
        ) : (
          <span className="featured__kickoff">
            {relativeDayLabel(match.kickoff, tz, nowMs)} ·{' '}
            <time dateTime={match.kickoff} className="mono">{formatTime(match.kickoff, tz)}</time>
          </span>
        )}
      </div>

      <div className="featured__matchup">
        <BigTeam code={match.home} align="end" />
        <div className="featured__center">
          {score ? (
            <div className="featured__score mono" aria-label="Score">
              <span>{score.home}</span>
              <span className="featured__score-sep">–</span>
              <span>{score.away}</span>
            </div>
          ) : (
            <span className="featured__vs">vs</span>
          )}
        </div>
        <BigTeam code={match.away} align="start" />
      </div>

      {match.status === 'upcoming' && (
        <div className="featured__countdown">
          <span className="featured__countdown-label">Kicks off in</span>
          <Countdown target={match.kickoff} variant="hero" />
        </div>
      )}

      <div className="featured__foot">
        <span className="featured__venue">
          {venue
            ? [venue.stadium, [venue.city, venue.country].filter(Boolean).join(', ')]
                .filter(Boolean)
                .join(' · ')
            : 'Venue to be confirmed'}
        </span>
        <BroadcasterPill broadcaster={match.broadcaster} variant="watch" />
      </div>
    </article>
  );
}
