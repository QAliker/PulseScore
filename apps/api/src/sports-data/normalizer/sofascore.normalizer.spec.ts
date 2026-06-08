import { SofascoreNormalizer } from './sofascore.normalizer';
import {
  SofascoreEvent,
  SofascoreLiveResponse,
} from '../interfaces/sofascore.interfaces';

function makeEvent(over: Partial<SofascoreEvent> = {}): SofascoreEvent {
  return {
    id: 100,
    tournament: {
      id: 17,
      name: 'Premier League',
      category: { id: 1, name: 'England', flag: 'england' },
    },
    homeTeam: { id: 1, name: 'Arsenal' },
    awayTeam: { id: 2, name: 'Chelsea' },
    homeScore: { current: 2 },
    awayScore: { current: 1 },
    status: { code: 6, description: '1st half', type: 'inprogress' },
    startTimestamp: 1_700_000_000,
    ...over,
  };
}

describe('SofascoreNormalizer', () => {
  const normalizer = new SofascoreNormalizer();

  it('maps a live event to a MatchDto', () => {
    const res: SofascoreLiveResponse = { events: [makeEvent()] };
    const [dto] = normalizer.toMatchDtos(res);

    expect(dto.id).toBe('sofa:100');
    expect(dto.externalId).toBe('sofa:100');
    expect(dto.status).toBe('LIVE');
    expect(dto.sport).toBe('Football');
    expect(dto.homeScore).toBe(2);
    expect(dto.awayScore).toBe(1);
    expect(dto.homeTeam.name).toBe('Arsenal');
    expect(dto.homeTeam.externalId).toBe('sofa:team:1');
    expect(dto.awayTeam.externalId).toBe('sofa:team:2');
    expect(dto.league?.name).toBe('Premier League');
    expect(dto.league?.country).toBe('England');
    expect(dto.league?.externalId).toBe('sofa:tournament:17');
    expect(dto.goalscorers).toEqual([]);
    expect(dto.cards).toEqual([]);
    expect(dto.lineups).toBeNull();
    expect(dto.startTime).toEqual(new Date(1_700_000_000 * 1000));
  });

  it('maps status types', () => {
    const cases: Array<[string, string]> = [
      ['inprogress', 'LIVE'],
      ['finished', 'FINISHED'],
      ['canceled', 'CANCELLED'],
      ['postponed', 'POSTPONED'],
      ['notstarted', 'SCHEDULED'],
      ['unknown', 'SCHEDULED'],
    ];
    for (const [type, expected] of cases) {
      const [dto] = normalizer.toMatchDtos({
        events: [makeEvent({ status: { code: 0, description: '', type } })],
      });
      expect(dto.status).toBe(expected);
    }
  });

  it('returns null progress when not live', () => {
    const [dto] = normalizer.toMatchDtos({
      events: [
        makeEvent({
          status: { code: 100, description: 'Ended', type: 'finished' },
        }),
      ],
    });
    expect(dto.progress).toBeNull();
  });

  it('returns "HT" progress at halftime', () => {
    const [dto] = normalizer.toMatchDtos({
      events: [
        makeEvent({
          status: { code: 31, description: 'Halftime', type: 'inprogress' },
        }),
      ],
    });
    expect(dto.progress).toBe('HT');
  });

  it('computes the live minute from period timestamps', () => {
    jest.spyOn(Date, 'now').mockReturnValue(1_700_000_180 * 1000); // +180s
    const [dto] = normalizer.toMatchDtos({
      events: [
        makeEvent({
          status: { code: 7, description: '2nd half', type: 'inprogress' },
          time: { initial: 2700, currentPeriodStartTimestamp: 1_700_000_000 },
        }),
      ],
    });
    // base 45 + elapsed 3 + 1 = 49
    expect(dto.progress).toBe('49');
    jest.restoreAllMocks();
  });

  it('handles missing scores as null', () => {
    const [dto] = normalizer.toMatchDtos({
      events: [makeEvent({ homeScore: undefined, awayScore: {} })],
    });
    expect(dto.homeScore).toBeNull();
    expect(dto.awayScore).toBeNull();
  });
});
