import { EspnLiveNormalizer } from './espn-live.normalizer';
import { EspnScoreboardResponse } from '../interfaces/espn-scoreboard.interfaces';

function scoreboard(
  overrides: Partial<{
    state: 'pre' | 'in' | 'post';
    name: string;
    displayClock: string;
    shortDetail: string;
    homeScore: string;
    awayScore: string;
  }> = {},
): EspnScoreboardResponse {
  const {
    state = 'in',
    name = 'STATUS_SECOND_HALF',
    displayClock = "67'",
    shortDetail = "67'",
    homeScore = '2',
    awayScore = '1',
  } = overrides;
  return {
    leagues: [
      {
        id: '730',
        name: 'Italian Serie A',
        slug: 'ita.1',
        logos: [{ href: 'https://logo/serie-a.png' }],
      },
    ],
    events: [
      {
        id: '401874928',
        date: '2026-08-23T18:00Z',
        status: { displayClock, type: { state, name, shortDetail } },
        competitions: [
          {
            venue: { fullName: 'Olimpico' },
            competitors: [
              {
                homeAway: 'home',
                score: homeScore,
                team: {
                  id: '104',
                  displayName: 'AS Roma',
                  logo: 'https://logo/roma.png',
                },
              },
              {
                homeAway: 'away',
                score: awayScore,
                team: { id: '109', displayName: 'Fiorentina' },
              },
            ],
          },
        ],
      },
    ],
  };
}

describe('EspnLiveNormalizer', () => {
  const norm = new EspnLiveNormalizer();

  it('maps a live event to a MatchDto', () => {
    const [m] = norm.toMatchDtos(scoreboard());
    expect(m.id).toBe('espn:401874928');
    expect(m.status).toBe('LIVE');
    expect(m.homeScore).toBe(2);
    expect(m.awayScore).toBe(1);
    expect(m.progress).toBe('67');
    expect(m.homeTeam.name).toBe('AS Roma');
    expect(m.homeTeam.id).toBe('espn:team:104');
    expect(m.awayTeam.logo).toBeNull();
    expect(m.venue).toBe('Olimpico');
    expect(m.league?.name).toBe('Italian Serie A');
    expect(m.league?.id).toBe('espn:league:ita.1');
  });

  it('returns HT progress at halftime', () => {
    const [m] = norm.toMatchDtos(
      scoreboard({ name: 'STATUS_HALFTIME', displayClock: "45'" }),
    );
    expect(m.progress).toBe('HT');
  });

  it('null progress and SCHEDULED for pre-match', () => {
    const [m] = norm.toMatchDtos(
      scoreboard({ state: 'pre', name: 'STATUS_SCHEDULED' }),
    );
    expect(m.status).toBe('SCHEDULED');
    expect(m.progress).toBeNull();
  });

  it('maps finished and postponed states', () => {
    const [fin] = norm.toMatchDtos(
      scoreboard({ state: 'post', name: 'STATUS_FULL_TIME' }),
    );
    expect(fin.status).toBe('FINISHED');
    const [pp] = norm.toMatchDtos(
      scoreboard({ state: 'post', name: 'STATUS_POSTPONED' }),
    );
    expect(pp.status).toBe('POSTPONED');
  });

  it('parses missing scores as null', () => {
    const [m] = norm.toMatchDtos(scoreboard({ homeScore: '', awayScore: 'x' }));
    expect(m.homeScore).toBeNull();
    expect(m.awayScore).toBeNull();
  });
});
