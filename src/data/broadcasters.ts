import type { Broadcaster } from './types';

// UK free-to-air rights to the World Cup are shared between the BBC and ITV.
// Each match below is assigned to one of these channels with a link to where a
// viewer in the UK can stream it. (Channel allocation is illustrative.)
export const BROADCASTERS: Broadcaster[] = [
  {
    id: 'bbc-one',
    channel: 'BBC One',
    streaming: 'BBC iPlayer',
    watchUrl: 'https://www.bbc.co.uk/iplayer/live/bbcone',
  },
  {
    id: 'bbc-two',
    channel: 'BBC Two',
    streaming: 'BBC iPlayer',
    watchUrl: 'https://www.bbc.co.uk/iplayer/live/bbctwo',
  },
  {
    id: 'itv1',
    channel: 'ITV1',
    streaming: 'ITVX',
    watchUrl: 'https://www.itv.com/watch/itv1',
  },
  {
    id: 'itv4',
    channel: 'ITV4',
    streaming: 'ITVX',
    watchUrl: 'https://www.itv.com/watch/itv4',
  },
];

export const BROADCASTERS_BY_ID: Record<string, Broadcaster> = Object.fromEntries(
  BROADCASTERS.map((b) => [b.id, b]),
);

// Used for fixtures the broadcast listings don't cover yet (games already
// played and dropped from the schedule page, the final round of group games,
// and the entire knockout bracket — whose participants aren't known).
export const BROADCASTER_TBC: Broadcaster = {
  id: 'tbc',
  channel: 'Broadcaster TBC',
  streaming: '',
  watchUrl: '',
};
