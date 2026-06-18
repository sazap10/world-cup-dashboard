import type { Team } from './types';

// 48 teams across 12 groups (A–L), the FIFA World Cup 2026 format.
// Group compositions follow the UK broadcast listings published by
// live-footballontv.com (the source of the "where to watch" data).
export const TEAMS: Team[] = [
  // Group A
  { code: 'CZE', name: 'Czech Republic', flag: '🇨🇿', group: 'A', confederation: 'UEFA' },
  { code: 'RSA', name: 'South Africa', flag: '🇿🇦', group: 'A', confederation: 'CAF' },
  { code: 'MEX', name: 'Mexico', flag: '🇲🇽', group: 'A', confederation: 'CONCACAF' },
  { code: 'KOR', name: 'South Korea', flag: '🇰🇷', group: 'A', confederation: 'AFC' },

  // Group B
  { code: 'SUI', name: 'Switzerland', flag: '🇨🇭', group: 'B', confederation: 'UEFA' },
  { code: 'BIH', name: 'Bosnia & Herzegovina', flag: '🇧🇦', group: 'B', confederation: 'UEFA' },
  { code: 'CAN', name: 'Canada', flag: '🇨🇦', group: 'B', confederation: 'CONCACAF' },
  { code: 'QAT', name: 'Qatar', flag: '🇶🇦', group: 'B', confederation: 'AFC' },

  // Group C
  { code: 'SCO', name: 'Scotland', flag: '🏴󠁧󠁢󠁳󠁣󠁴󠁿', group: 'C', confederation: 'UEFA' },
  { code: 'MAR', name: 'Morocco', flag: '🇲🇦', group: 'C', confederation: 'CAF' },
  { code: 'BRA', name: 'Brazil', flag: '🇧🇷', group: 'C', confederation: 'CONMEBOL' },
  { code: 'HAI', name: 'Haiti', flag: '🇭🇹', group: 'C', confederation: 'CONCACAF' },

  // Group D
  { code: 'USA', name: 'United States', flag: '🇺🇸', group: 'D', confederation: 'CONCACAF' },
  { code: 'AUS', name: 'Australia', flag: '🇦🇺', group: 'D', confederation: 'AFC' },
  { code: 'TUR', name: 'Turkey', flag: '🇹🇷', group: 'D', confederation: 'UEFA' },
  { code: 'PAR', name: 'Paraguay', flag: '🇵🇾', group: 'D', confederation: 'CONMEBOL' },

  // Group E
  { code: 'GER', name: 'Germany', flag: '🇩🇪', group: 'E', confederation: 'UEFA' },
  { code: 'CIV', name: "Côte d'Ivoire", flag: '🇨🇮', group: 'E', confederation: 'CAF' },
  { code: 'ECU', name: 'Ecuador', flag: '🇪🇨', group: 'E', confederation: 'CONMEBOL' },
  { code: 'CUW', name: 'Curaçao', flag: '🇨🇼', group: 'E', confederation: 'CONCACAF' },

  // Group F
  { code: 'NED', name: 'Netherlands', flag: '🇳🇱', group: 'F', confederation: 'UEFA' },
  { code: 'SWE', name: 'Sweden', flag: '🇸🇪', group: 'F', confederation: 'UEFA' },
  { code: 'TUN', name: 'Tunisia', flag: '🇹🇳', group: 'F', confederation: 'CAF' },
  { code: 'JPN', name: 'Japan', flag: '🇯🇵', group: 'F', confederation: 'AFC' },

  // Group G
  { code: 'BEL', name: 'Belgium', flag: '🇧🇪', group: 'G', confederation: 'UEFA' },
  { code: 'IRN', name: 'Iran', flag: '🇮🇷', group: 'G', confederation: 'AFC' },
  { code: 'NZL', name: 'New Zealand', flag: '🇳🇿', group: 'G', confederation: 'OFC' },
  { code: 'EGY', name: 'Egypt', flag: '🇪🇬', group: 'G', confederation: 'CAF' },

  // Group H
  { code: 'ESP', name: 'Spain', flag: '🇪🇸', group: 'H', confederation: 'UEFA' },
  { code: 'KSA', name: 'Saudi Arabia', flag: '🇸🇦', group: 'H', confederation: 'AFC' },
  { code: 'URU', name: 'Uruguay', flag: '🇺🇾', group: 'H', confederation: 'CONMEBOL' },
  { code: 'CPV', name: 'Cape Verde', flag: '🇨🇻', group: 'H', confederation: 'CAF' },

  // Group I
  { code: 'FRA', name: 'France', flag: '🇫🇷', group: 'I', confederation: 'UEFA' },
  { code: 'IRQ', name: 'Iraq', flag: '🇮🇶', group: 'I', confederation: 'AFC' },
  { code: 'NOR', name: 'Norway', flag: '🇳🇴', group: 'I', confederation: 'UEFA' },
  { code: 'SEN', name: 'Senegal', flag: '🇸🇳', group: 'I', confederation: 'CAF' },

  // Group J
  { code: 'ARG', name: 'Argentina', flag: '🇦🇷', group: 'J', confederation: 'CONMEBOL' },
  { code: 'AUT', name: 'Austria', flag: '🇦🇹', group: 'J', confederation: 'UEFA' },
  { code: 'JOR', name: 'Jordan', flag: '🇯🇴', group: 'J', confederation: 'AFC' },
  { code: 'ALG', name: 'Algeria', flag: '🇩🇿', group: 'J', confederation: 'CAF' },

  // Group K
  { code: 'UZB', name: 'Uzbekistan', flag: '🇺🇿', group: 'K', confederation: 'AFC' },
  { code: 'COL', name: 'Colombia', flag: '🇨🇴', group: 'K', confederation: 'CONMEBOL' },
  { code: 'POR', name: 'Portugal', flag: '🇵🇹', group: 'K', confederation: 'UEFA' },
  { code: 'COD', name: 'DR Congo', flag: '🇨🇩', group: 'K', confederation: 'CAF' },

  // Group L
  { code: 'GHA', name: 'Ghana', flag: '🇬🇭', group: 'L', confederation: 'CAF' },
  { code: 'PAN', name: 'Panama', flag: '🇵🇦', group: 'L', confederation: 'CONCACAF' },
  { code: 'ENG', name: 'England', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', group: 'L', confederation: 'UEFA' },
  { code: 'CRO', name: 'Croatia', flag: '🇭🇷', group: 'L', confederation: 'UEFA' },
];

export const TEAMS_BY_CODE: Record<string, Team> = Object.fromEntries(
  TEAMS.map((t) => [t.code, t]),
);

export const GROUP_IDS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'] as const;

export function teamsInGroup(group: string): Team[] {
  return TEAMS.filter((t) => t.group === group);
}
