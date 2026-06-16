// Minimal football-data.org v4 mock for running the app in "live" mode without
// a real API token. Returns a realistic /v4/competitions/WC/matches payload:
//   - one FINISHED group-stage game (drives Results + group standings)
//   - one knockout (FINAL) game whose teams have NO group — this is the
//     regression guard for the "don't fabricate Group A" fix: those teams must
//     NOT appear in the Group A table.
// Listens on :9099. Point the server at it with FD_UPSTREAM=http://127.0.0.1:9099.
import http from 'node:http';

const payload = {
  matches: [
    {
      id: 1,
      utcDate: '2026-06-11T16:00:00Z',
      status: 'FINISHED',
      stage: 'GROUP_STAGE',
      group: 'Group A',
      matchday: 1,
      minute: null,
      venue: 'Estadio Azteca',
      homeTeam: { id: 10, name: 'Mexico', shortName: 'Mexico', tla: 'MEX', crest: '' },
      awayTeam: { id: 11, name: 'Croatia', shortName: 'Croatia', tla: 'CRO', crest: '' },
      score: { fullTime: { home: 2, away: 1 } },
    },
    {
      id: 2,
      utcDate: '2026-07-11T19:00:00Z',
      status: 'SCHEDULED',
      stage: 'FINAL',
      group: null,
      matchday: null,
      minute: null,
      venue: 'MetLife Stadium',
      homeTeam: { id: 20, name: 'Brazil', shortName: 'Brazil', tla: 'BRA', crest: '' },
      awayTeam: { id: 21, name: 'France', shortName: 'France', tla: 'FRA', crest: '' },
      score: { fullTime: { home: null, away: null } },
    },
  ],
};

const port = Number(process.env.MOCK_PORT ?? 9099);
http
  .createServer((_req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(payload));
  })
  .listen(port, () => console.log(`mock football-data upstream on :${port}`));
