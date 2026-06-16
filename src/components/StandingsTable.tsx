import type { Standing } from '../data/types';
import { Flag } from './Flag';
import { FormGuide } from './FormGuide';

interface Props {
  group: string;
  standings: Standing[];
}

function zoneClass(rank: number): string {
  if (rank <= 2) return ' is-through';
  if (rank === 3) return ' is-playoff';
  return '';
}

export function StandingsTable({ group, standings }: Props) {
  const anyPlayed = standings.some((s) => s.played > 0);
  return (
    <div className="standings">
      <div className="standings__head">
        <h3 className="standings__group">Group {group}</h3>
        {!anyPlayed && <span className="standings__note">Not started</span>}
      </div>
      <table className="standings__table">
        <thead>
          <tr>
            <th className="col-pos" scope="col"><span className="visually-hidden">Position</span>#</th>
            <th className="col-team" scope="col">Team</th>
            <th scope="col" title="Played">P</th>
            <th className="col-opt" scope="col" title="Won">W</th>
            <th className="col-opt" scope="col" title="Drawn">D</th>
            <th className="col-opt" scope="col" title="Lost">L</th>
            <th className="col-opt" scope="col" title="Goals for">GF</th>
            <th className="col-opt" scope="col" title="Goals against">GA</th>
            <th scope="col" title="Goal difference">GD</th>
            <th scope="col" title="Points">Pts</th>
            <th className="col-form" scope="col">Form</th>
          </tr>
        </thead>
        <tbody>
          {standings.map((s) => (
            <tr key={s.team.code} className={'standings__row' + zoneClass(s.rank)}>
              <td className="col-pos tnum">{s.rank}</td>
              <td className="col-team">
                <span className="standings__team">
                  <Flag flag={s.team.flag} size="sm" />
                  <span className="standings__name">{s.team.name}</span>
                  <span className="standings__code">{s.team.code}</span>
                </span>
              </td>
              <td className="tnum">{s.played}</td>
              <td className="col-opt tnum">{s.won}</td>
              <td className="col-opt tnum">{s.drawn}</td>
              <td className="col-opt tnum">{s.lost}</td>
              <td className="col-opt tnum">{s.goalsFor}</td>
              <td className="col-opt tnum">{s.goalsAgainst}</td>
              <td className="tnum">{s.goalDifference > 0 ? `+${s.goalDifference}` : s.goalDifference}</td>
              <td className="col-pts tnum">{s.points}</td>
              <td className="col-form"><FormGuide form={s.form} max={3} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
