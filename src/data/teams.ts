import type { Team } from './types';

// 48 teams across 12 groups (A–L), the FIFA World Cup 2026 format.
// Compositions are illustrative seed data for the dashboard, not the official draw.
export const TEAMS: Team[] = [
  // Group A
  { code: 'MEX', name: 'Mexico', flag: '🇲🇽', group: 'A', confederation: 'CONCACAF' },
  { code: 'CRO', name: 'Croatia', flag: '🇭🇷', group: 'A', confederation: 'UEFA' },
  { code: 'KSA', name: 'Saudi Arabia', flag: '🇸🇦', group: 'A', confederation: 'AFC' },
  { code: 'GHA', name: 'Ghana', flag: '🇬🇭', group: 'A', confederation: 'CAF' },

  // Group B
  { code: 'CAN', name: 'Canada', flag: '🇨🇦', group: 'B', confederation: 'CONCACAF' },
  { code: 'BEL', name: 'Belgium', flag: '🇧🇪', group: 'B', confederation: 'UEFA' },
  { code: 'ECU', name: 'Ecuador', flag: '🇪🇨', group: 'B', confederation: 'CONMEBOL' },
  { code: 'NZL', name: 'New Zealand', flag: '🇳🇿', group: 'B', confederation: 'OFC' },

  // Group C
  { code: 'ARG', name: 'Argentina', flag: '🇦🇷', group: 'C', confederation: 'CONMEBOL' },
  { code: 'NOR', name: 'Norway', flag: '🇳🇴', group: 'C', confederation: 'UEFA' },
  { code: 'EGY', name: 'Egypt', flag: '🇪🇬', group: 'C', confederation: 'CAF' },
  { code: 'IRQ', name: 'Iraq', flag: '🇮🇶', group: 'C', confederation: 'AFC' },

  // Group D
  { code: 'USA', name: 'United States', flag: '🇺🇸', group: 'D', confederation: 'CONCACAF' },
  { code: 'NED', name: 'Netherlands', flag: '🇳🇱', group: 'D', confederation: 'UEFA' },
  { code: 'TUN', name: 'Tunisia', flag: '🇹🇳', group: 'D', confederation: 'CAF' },
  { code: 'JAM', name: 'Jamaica', flag: '🇯🇲', group: 'D', confederation: 'CONCACAF' },

  // Group E
  { code: 'ESP', name: 'Spain', flag: '🇪🇸', group: 'E', confederation: 'UEFA' },
  { code: 'URU', name: 'Uruguay', flag: '🇺🇾', group: 'E', confederation: 'CONMEBOL' },
  { code: 'IRN', name: 'Iran', flag: '🇮🇷', group: 'E', confederation: 'AFC' },
  { code: 'CRC', name: 'Costa Rica', flag: '🇨🇷', group: 'E', confederation: 'CONCACAF' },

  // Group F
  { code: 'FRA', name: 'France', flag: '🇫🇷', group: 'F', confederation: 'UEFA' },
  { code: 'SEN', name: 'Senegal', flag: '🇸🇳', group: 'F', confederation: 'CAF' },
  { code: 'AUS', name: 'Australia', flag: '🇦🇺', group: 'F', confederation: 'AFC' },
  { code: 'PAN', name: 'Panama', flag: '🇵🇦', group: 'F', confederation: 'CONCACAF' },

  // Group G
  { code: 'BRA', name: 'Brazil', flag: '🇧🇷', group: 'G', confederation: 'CONMEBOL' },
  { code: 'SUI', name: 'Switzerland', flag: '🇨🇭', group: 'G', confederation: 'UEFA' },
  { code: 'NGA', name: 'Nigeria', flag: '🇳🇬', group: 'G', confederation: 'CAF' },
  { code: 'UZB', name: 'Uzbekistan', flag: '🇺🇿', group: 'G', confederation: 'AFC' },

  // Group H
  { code: 'POR', name: 'Portugal', flag: '🇵🇹', group: 'H', confederation: 'UEFA' },
  { code: 'COL', name: 'Colombia', flag: '🇨🇴', group: 'H', confederation: 'CONMEBOL' },
  { code: 'CMR', name: 'Cameroon', flag: '🇨🇲', group: 'H', confederation: 'CAF' },
  { code: 'BOL', name: 'Bolivia', flag: '🇧🇴', group: 'H', confederation: 'CONMEBOL' },

  // Group I
  { code: 'ENG', name: 'England', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', group: 'I', confederation: 'UEFA' },
  { code: 'DEN', name: 'Denmark', flag: '🇩🇰', group: 'I', confederation: 'UEFA' },
  { code: 'ALG', name: 'Algeria', flag: '🇩🇿', group: 'I', confederation: 'CAF' },
  { code: 'QAT', name: 'Qatar', flag: '🇶🇦', group: 'I', confederation: 'AFC' },

  // Group J
  { code: 'GER', name: 'Germany', flag: '🇩🇪', group: 'J', confederation: 'UEFA' },
  { code: 'SRB', name: 'Serbia', flag: '🇷🇸', group: 'J', confederation: 'UEFA' },
  { code: 'CIV', name: "Côte d'Ivoire", flag: '🇨🇮', group: 'J', confederation: 'CAF' },
  { code: 'KOR', name: 'South Korea', flag: '🇰🇷', group: 'J', confederation: 'AFC' },

  // Group K
  { code: 'ITA', name: 'Italy', flag: '🇮🇹', group: 'K', confederation: 'UEFA' },
  { code: 'MAR', name: 'Morocco', flag: '🇲🇦', group: 'K', confederation: 'CAF' },
  { code: 'JPN', name: 'Japan', flag: '🇯🇵', group: 'K', confederation: 'AFC' },
  { code: 'COD', name: 'DR Congo', flag: '🇨🇩', group: 'K', confederation: 'CAF' },

  // Group L
  { code: 'POL', name: 'Poland', flag: '🇵🇱', group: 'L', confederation: 'UEFA' },
  { code: 'UKR', name: 'Ukraine', flag: '🇺🇦', group: 'L', confederation: 'UEFA' },
  { code: 'PAR', name: 'Paraguay', flag: '🇵🇾', group: 'L', confederation: 'CONMEBOL' },
  { code: 'AUT', name: 'Austria', flag: '🇦🇹', group: 'L', confederation: 'UEFA' },
];

export const TEAMS_BY_CODE: Record<string, Team> = Object.fromEntries(
  TEAMS.map((t) => [t.code, t]),
);

export const GROUP_IDS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'] as const;

export function teamsInGroup(group: string): Team[] {
  return TEAMS.filter((t) => t.group === group);
}
