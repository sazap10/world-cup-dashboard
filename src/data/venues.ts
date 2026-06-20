import type { Venue } from './types';

// The 16 host cities of the 2026 World Cup (USA, Canada, Mexico).
export const VENUES: Venue[] = [
  { id: 'mex-azteca', stadium: 'Estadio Azteca', city: 'Mexico City', country: 'Mexico' },
  { id: 'mex-akron', stadium: 'Estadio Akron', city: 'Guadalajara', country: 'Mexico' },
  { id: 'mex-bbva', stadium: 'Estadio BBVA', city: 'Monterrey', country: 'Mexico' },
  { id: 'can-bmo', stadium: 'BMO Field', city: 'Toronto', country: 'Canada' },
  { id: 'can-bcplace', stadium: 'BC Place', city: 'Vancouver', country: 'Canada' },
  { id: 'usa-metlife', stadium: 'MetLife Stadium', city: 'New York / New Jersey', country: 'USA' },
  { id: 'usa-att', stadium: 'AT&T Stadium', city: 'Dallas', country: 'USA' },
  { id: 'usa-sofi', stadium: 'SoFi Stadium', city: 'Los Angeles', country: 'USA' },
  { id: 'usa-mercedes', stadium: 'Mercedes-Benz Stadium', city: 'Atlanta', country: 'USA' },
  { id: 'usa-arrowhead', stadium: 'Arrowhead Stadium', city: 'Kansas City', country: 'USA' },
  { id: 'usa-lincoln', stadium: 'Lincoln Financial Field', city: 'Philadelphia', country: 'USA' },
  { id: 'usa-levis', stadium: "Levi's Stadium", city: 'San Francisco Bay Area', country: 'USA' },
  { id: 'usa-gillette', stadium: 'Gillette Stadium', city: 'Boston', country: 'USA' },
  { id: 'usa-hardrock', stadium: 'Hard Rock Stadium', city: 'Miami', country: 'USA' },
  { id: 'usa-nrg', stadium: 'NRG Stadium', city: 'Houston', country: 'USA' },
  { id: 'usa-lumen', stadium: 'Lumen Field', city: 'Seattle', country: 'USA' },
];

export const VENUES_BY_ID: Record<string, Venue> = Object.fromEntries(VENUES.map((v) => [v.id, v]));

/** Resolve a venue id to its venue, throwing on an unknown id so data typos surface. */
export function venueById(id: string): Venue {
  const venue = VENUES_BY_ID[id];
  if (!venue) throw new Error(`Unknown venue id: ${id}`);
  return venue;
}
