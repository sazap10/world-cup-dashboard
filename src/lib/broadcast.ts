import type { Broadcaster } from '../data/types';
import { BROADCASTERS } from '../data/broadcasters';

// No football data API reports UK TV rights, so we assign a BBC/ITV channel
// locally and deterministically from a stable key (the match id). This keeps
// the "where to watch" feature working identically for seed and live data.
function hashString(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function pickBroadcaster(key: string): Broadcaster {
  return BROADCASTERS[hashString(key) % BROADCASTERS.length];
}
