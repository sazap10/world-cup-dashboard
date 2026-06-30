// Real venue assignments for every match of the 2026 World Cup, transcribed
// from FIFA's published schedule (via the en.wikipedia.org match tables, which
// mirror FIFA's allocation). The 16 host stadiums live in ./venues; this module
// maps each of the 104 fixtures onto one of them.
//
// Group stage (matches 1–72) is keyed by the team pairing, since the app builds
// group ties from the real draw (see ./teams) rather than by FIFA match number.
// Knockout (matches 73–104) is keyed by FIFA match number, since those ties are
// venue-fixed in the bracket regardless of which teams reach them.

/** Order-independent key for a tie, so home/away ordering doesn't matter. */
function pairKey(a: string, b: string): string {
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}

// [home, away, venueId] for all 72 group-stage ties. Order within a pair is the
// FIFA-listed home/away; lookups are order-independent via pairKey().
const GROUP_VENUES: [string, string, string][] = [
  ['MEX', 'RSA', 'mex-azteca'],
  ['KOR', 'CZE', 'mex-akron'],
  ['CZE', 'RSA', 'usa-mercedes'],
  ['MEX', 'KOR', 'mex-akron'],
  ['CZE', 'MEX', 'mex-azteca'],
  ['RSA', 'KOR', 'mex-bbva'],
  ['CAN', 'BIH', 'can-bmo'],
  ['QAT', 'SUI', 'usa-levis'],
  ['SUI', 'BIH', 'usa-sofi'],
  ['CAN', 'QAT', 'can-bcplace'],
  ['SUI', 'CAN', 'can-bcplace'],
  ['BIH', 'QAT', 'usa-lumen'],
  ['BRA', 'MAR', 'usa-metlife'],
  ['HAI', 'SCO', 'usa-gillette'],
  ['SCO', 'MAR', 'usa-gillette'],
  ['BRA', 'HAI', 'usa-lincoln'],
  ['SCO', 'BRA', 'usa-hardrock'],
  ['MAR', 'HAI', 'usa-mercedes'],
  ['USA', 'PAR', 'usa-sofi'],
  ['AUS', 'TUR', 'can-bcplace'],
  ['USA', 'AUS', 'usa-lumen'],
  ['TUR', 'PAR', 'usa-levis'],
  ['TUR', 'USA', 'usa-sofi'],
  ['PAR', 'AUS', 'usa-levis'],
  ['GER', 'CUW', 'usa-nrg'],
  ['CIV', 'ECU', 'usa-lincoln'],
  ['GER', 'CIV', 'can-bmo'],
  ['ECU', 'CUW', 'usa-arrowhead'],
  ['CUW', 'CIV', 'usa-lincoln'],
  ['ECU', 'GER', 'usa-metlife'],
  ['NED', 'JPN', 'usa-att'],
  ['SWE', 'TUN', 'mex-bbva'],
  ['NED', 'SWE', 'usa-nrg'],
  ['TUN', 'JPN', 'mex-bbva'],
  ['JPN', 'SWE', 'usa-att'],
  ['TUN', 'NED', 'usa-arrowhead'],
  ['BEL', 'EGY', 'usa-lumen'],
  ['IRN', 'NZL', 'usa-sofi'],
  ['BEL', 'IRN', 'usa-sofi'],
  ['NZL', 'EGY', 'can-bcplace'],
  ['EGY', 'IRN', 'usa-lumen'],
  ['NZL', 'BEL', 'can-bcplace'],
  ['ESP', 'CPV', 'usa-mercedes'],
  ['KSA', 'URU', 'usa-hardrock'],
  ['ESP', 'KSA', 'usa-mercedes'],
  ['URU', 'CPV', 'usa-hardrock'],
  ['CPV', 'KSA', 'usa-nrg'],
  ['URU', 'ESP', 'mex-akron'],
  ['FRA', 'SEN', 'usa-metlife'],
  ['IRQ', 'NOR', 'usa-gillette'],
  ['FRA', 'IRQ', 'usa-lincoln'],
  ['NOR', 'SEN', 'usa-metlife'],
  ['NOR', 'FRA', 'usa-gillette'],
  ['SEN', 'IRQ', 'can-bmo'],
  ['ARG', 'ALG', 'usa-arrowhead'],
  ['AUT', 'JOR', 'usa-levis'],
  ['ARG', 'AUT', 'usa-att'],
  ['JOR', 'ALG', 'usa-levis'],
  ['ALG', 'AUT', 'usa-arrowhead'],
  ['JOR', 'ARG', 'usa-att'],
  ['POR', 'COD', 'usa-nrg'],
  ['UZB', 'COL', 'mex-azteca'],
  ['POR', 'UZB', 'usa-nrg'],
  ['COL', 'COD', 'mex-akron'],
  ['COL', 'POR', 'usa-hardrock'],
  ['COD', 'UZB', 'usa-mercedes'],
  ['ENG', 'CRO', 'usa-att'],
  ['GHA', 'PAN', 'can-bmo'],
  ['ENG', 'GHA', 'usa-gillette'],
  ['PAN', 'CRO', 'can-bmo'],
  ['PAN', 'ENG', 'usa-metlife'],
  ['CRO', 'GHA', 'usa-lincoln'],
];

const GROUP_VENUE_BY_PAIR: Record<string, string> = Object.fromEntries(
  GROUP_VENUES.map(([h, a, v]) => [pairKey(h, a), v]),
);

/** Real host venue id for a group tie, or null if the pairing isn't a real one. */
export function venueIdForPair(home: string, away: string): string | null {
  return GROUP_VENUE_BY_PAIR[pairKey(home, away)] ?? null;
}

// FIFA match number (73–104) → host venue id for the knockout bracket. These are
// venue-fixed regardless of participants. Match 103 is the third-place play-off
// (Miami); 104 is the final (New York/New Jersey).
export const KNOCKOUT_VENUE_BY_MATCH: Record<number, string> = {
  73: 'usa-sofi',
  74: 'usa-nrg',
  75: 'usa-gillette',
  76: 'mex-bbva',
  77: 'usa-att',
  78: 'usa-metlife',
  79: 'mex-azteca',
  80: 'usa-mercedes',
  81: 'usa-lumen',
  82: 'usa-levis',
  83: 'usa-sofi',
  84: 'can-bmo',
  85: 'can-bcplace',
  86: 'usa-att',
  87: 'usa-hardrock',
  88: 'usa-arrowhead',
  89: 'usa-lincoln',
  90: 'usa-nrg',
  91: 'usa-metlife',
  92: 'mex-azteca',
  93: 'usa-att',
  94: 'usa-lumen',
  95: 'usa-mercedes',
  96: 'can-bcplace',
  97: 'usa-gillette',
  98: 'usa-sofi',
  99: 'usa-hardrock',
  100: 'usa-arrowhead',
  101: 'usa-att',
  102: 'usa-mercedes',
  103: 'usa-hardrock',
  104: 'usa-metlife',
};

/** Real host venue id for a knockout match by its FIFA match number. */
export function venueIdForKnockoutMatch(fifaMatch: number): string | null {
  return KNOCKOUT_VENUE_BY_MATCH[fifaMatch] ?? null;
}
