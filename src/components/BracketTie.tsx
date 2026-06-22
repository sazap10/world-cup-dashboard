import { useTimezone } from '../app/providers';
import type { BracketMatch } from '../lib/knockout';
import { formatDayShort, formatTime } from '../lib/time';
import { BroadcasterPill } from './BroadcasterPill';
import { Flag } from './Flag';

function Slot({ slot }: { slot: BracketMatch['home'] }) {
  const team = slot.team;
  return (
    <div className={`tie-slot${team ? '' : ' tie-slot--empty'}`}>
      {team ? (
        <Flag flag={team.flag} crest={team.crest} size="sm" />
      ) : (
        <span className="flag flag--sm flag--slot" aria-hidden="true" />
      )}
      <span className="tie-slot__name">{team ? team.name : slot.label}</span>
    </div>
  );
}

export function BracketTie({ tie }: { tie: BracketMatch }) {
  const { tz } = useTimezone();
  const { match } = tie;
  return (
    <article className="tie">
      <div className="tie__meta">
        <span className="tie__date">
          {formatDayShort(match.kickoff, tz)} ·{' '}
          <span className="mono">{formatTime(match.kickoff, tz)}</span>
        </span>
        <span className="tie__id">{match.id.replace('K-', '')}</span>
      </div>
      <div className="tie__slots">
        <Slot slot={tie.home} />
        <Slot slot={tie.away} />
      </div>
      <div className="tie__foot">
        <BroadcasterPill broadcaster={match.broadcaster} variant="tag" />
      </div>
    </article>
  );
}
