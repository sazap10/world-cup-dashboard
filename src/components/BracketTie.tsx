import type { BracketMatch } from '../lib/knockout';
import { formatDayShort, formatTime } from '../lib/time';
import { useTimezone } from '../app/providers';
import { Flag } from './Flag';
import { BroadcasterPill } from './BroadcasterPill';

function Slot({ slot }: { slot: BracketMatch['home'] }) {
  const team = slot.team;
  return (
    <div className={'tie-slot' + (team ? '' : ' tie-slot--empty')}>
      {team ? <Flag flag={team.flag} size="sm" /> : <span className="flag flag--sm flag--slot" aria-hidden="true" />}
      <span className="tie-slot__name">{team ? team.name : slot.label}</span>
      {team && slot.provisional && <span className="tie-slot__prov" title="Provisional, group not yet decided">≈</span>}
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
          {formatDayShort(match.kickoff, tz)} · <span className="mono">{formatTime(match.kickoff, tz)}</span>
        </span>
        <span className="tie__id">{match.id.replace('K-', '')}</span>
      </div>
      <div className="tie__slots">
        <Slot slot={tie.home} />
        <Slot slot={tie.away} />
      </div>
      <div className="tie__foot">
        <BroadcasterPill broadcasterId={match.broadcasterId} variant="tag" />
      </div>
    </article>
  );
}
