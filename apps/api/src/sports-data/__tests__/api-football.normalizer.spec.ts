import { ApiFootballNormalizer } from '../normalizer/api-football.normalizer';
import {
  RafFixture,
  RafStandingEntry,
  RafPlayerResponse,
} from '../interfaces/api-football.interfaces';

describe('ApiFootballNormalizer', () => {
  let normalizer: ApiFootballNormalizer;

  beforeEach(() => {
    normalizer = new ApiFootballNormalizer();
  });

  describe('normalizeStatus', () => {
    it('should return LIVE for "1H"', () => {
      expect(normalizer.normalizeStatus('1H')).toBe('LIVE');
    });

    it('should return LIVE for "HT"', () => {
      expect(normalizer.normalizeStatus('HT')).toBe('LIVE');
    });

    it('should return LIVE for "2H"', () => {
      expect(normalizer.normalizeStatus('2H')).toBe('LIVE');
    });

    it('should return FINISHED for "FT"', () => {
      expect(normalizer.normalizeStatus('FT')).toBe('FINISHED');
    });

    it('should return FINISHED for "AET"', () => {
      expect(normalizer.normalizeStatus('AET')).toBe('FINISHED');
    });

    it('should return FINISHED for "PEN"', () => {
      expect(normalizer.normalizeStatus('PEN')).toBe('FINISHED');
    });

    it('should return POSTPONED for "PST"', () => {
      expect(normalizer.normalizeStatus('PST')).toBe('POSTPONED');
    });

    it('should return CANCELLED for "CANC"', () => {
      expect(normalizer.normalizeStatus('CANC')).toBe('CANCELLED');
    });

    it('should return SCHEDULED for "NS"', () => {
      expect(normalizer.normalizeStatus('NS')).toBe('SCHEDULED');
    });

    it('should return SCHEDULED for unknown status', () => {
      expect(normalizer.normalizeStatus('???')).toBe('SCHEDULED');
    });
  });

  describe('normalizeFixture', () => {
    const mockFixture: RafFixture = {
      fixture: {
        id: 292061,
        referee: 'M. Oliver',
        timezone: 'UTC',
        date: '2026-04-10T20:45:00+00:00',
        timestamp: 1744321500,
        periods: { first: null, second: null },
        venue: { id: 1, name: 'Elland Road', city: 'Leeds' },
        status: { long: 'Match Finished', short: 'FT', elapsed: 90 },
      },
      league: {
        id: 40,
        name: 'Championship',
        country: 'England',
        logo: 'https://example.com/logo.png',
        flag: 'https://example.com/flag.png',
        season: 2025,
        round: 'Regular Season - 38',
      },
      teams: {
        home: {
          id: 2627,
          name: 'Leeds United',
          logo: 'https://example.com/leeds.png',
          winner: true,
        },
        away: {
          id: 2637,
          name: 'Sheffield Wednesday',
          logo: 'https://example.com/sheffield.png',
          winner: false,
        },
      },
      goals: { home: 2, away: 1 },
      score: {
        halftime: { home: 1, away: 0 },
        fulltime: { home: 2, away: 1 },
        extratime: { home: null, away: null },
        penalty: { home: null, away: null },
      },
      events: [
        {
          time: { elapsed: 23, extra: null },
          team: { id: 2627, name: 'Leeds United', logo: '' },
          player: { id: 1234, name: 'P. Bamford' },
          assist: { id: 1235, name: 'R. James' },
          type: 'Goal',
          detail: 'Normal Goal',
          comments: null,
        },
        {
          time: { elapsed: 55, extra: null },
          team: { id: 2627, name: 'Leeds United', logo: '' },
          player: { id: 1236, name: 'K. Phillips' },
          assist: { id: null, name: null },
          type: 'Card',
          detail: 'Yellow Card',
          comments: null,
        },
      ],
      lineups: [],
      statistics: [],
      players: [],
    };

    it('should map externalId from fixture.id', () => {
      const dto = normalizer.normalizeFixture(mockFixture);
      expect(dto.externalId).toBe('292061');
    });

    it('should set home team name and logo', () => {
      const dto = normalizer.normalizeFixture(mockFixture);
      expect(dto.homeTeam.name).toBe('Leeds United');
      expect(dto.homeTeam.logo).toBe('https://example.com/leeds.png');
    });

    it('should set away team name and logo', () => {
      const dto = normalizer.normalizeFixture(mockFixture);
      expect(dto.awayTeam.name).toBe('Sheffield Wednesday');
    });

    it('should set scores from goals', () => {
      const dto = normalizer.normalizeFixture(mockFixture);
      expect(dto.homeScore).toBe(2);
      expect(dto.awayScore).toBe(1);
    });

    it('should pass null scores through', () => {
      const noScore = {
        ...mockFixture,
        goals: { home: null, away: null },
      };
      const dto = normalizer.normalizeFixture(noScore);
      expect(dto.homeScore).toBeNull();
      expect(dto.awayScore).toBeNull();
    });

    it('should set status to FINISHED for FT', () => {
      const dto = normalizer.normalizeFixture(mockFixture);
      expect(dto.status).toBe('FINISHED');
    });

    it('should set startTime from fixture.date', () => {
      const dto = normalizer.normalizeFixture(mockFixture);
      expect(dto.startTime).toEqual(new Date('2026-04-10T20:45:00+00:00'));
    });

    it('should set venue from fixture.venue.name', () => {
      const dto = normalizer.normalizeFixture(mockFixture);
      expect(dto.venue).toBe('Elland Road');
    });

    it('should extract round number from league.round', () => {
      const dto = normalizer.normalizeFixture(mockFixture);
      expect(dto.round).toBe(38);
    });

    it('should set league info', () => {
      const dto = normalizer.normalizeFixture(mockFixture);
      expect(dto.league?.externalId).toBe('40');
      expect(dto.league?.name).toBe('Championship');
      expect(dto.league?.country).toBe('England');
    });

    it('should extract goalscorers from Goal events', () => {
      const dto = normalizer.normalizeFixture(mockFixture);
      expect(dto.goalscorers).toHaveLength(1);
      expect(dto.goalscorers[0].time).toBe('23');
      expect(dto.goalscorers[0].homeScorer).toBe('P. Bamford');
    });

    it('should extract cards from Card events', () => {
      const dto = normalizer.normalizeFixture(mockFixture);
      expect(dto.cards).toHaveLength(1);
      expect(dto.cards[0].time).toBe('55');
      expect(dto.cards[0].homeFault).toBe('K. Phillips');
      expect(dto.cards[0].card).toBe('Yellow Card');
    });

    it('should set sport to Football', () => {
      const dto = normalizer.normalizeFixture(mockFixture);
      expect(dto.sport).toBe('Football');
    });

    it('normalizeMatch should be an alias for normalizeFixture', () => {
      const dto = normalizer.normalizeMatch(mockFixture);
      expect(dto.externalId).toBe('292061');
    });
  });

  describe('normalizeStanding', () => {
    const mockEntry: RafStandingEntry = {
      rank: 1,
      team: {
        id: 2627,
        name: 'Leeds United',
        logo: 'https://example.com/leeds.png',
      },
      points: 83,
      goalsDiff: 40,
      group: 'Championship',
      form: 'WWWDW',
      status: 'same',
      description: 'Promotion - Premier League',
      all: {
        played: 38,
        win: 25,
        draw: 8,
        lose: 5,
        goals: { for: 70, against: 30 },
      },
      home: {
        played: 19,
        win: 14,
        draw: 3,
        lose: 2,
        goals: { for: 38, against: 15 },
      },
      away: {
        played: 19,
        win: 11,
        draw: 5,
        lose: 3,
        goals: { for: 32, against: 15 },
      },
      update: '2026-05-01T00:00:00+00:00',
    };

    it('should map position from rank', () => {
      const dto = normalizer.normalizeStanding(mockEntry, '40', 'Championship');
      expect(dto.position).toBe(1);
    });

    it('should map all stats', () => {
      const dto = normalizer.normalizeStanding(mockEntry, '40', 'Championship');
      expect(dto.played).toBe(38);
      expect(dto.won).toBe(25);
      expect(dto.drawn).toBe(8);
      expect(dto.lost).toBe(5);
      expect(dto.goalsFor).toBe(70);
      expect(dto.goalsAgainst).toBe(30);
      expect(dto.points).toBe(83);
    });

    it('should set team badge', () => {
      const dto = normalizer.normalizeStanding(mockEntry, '40', 'Championship');
      expect(dto.teamBadge).toBe('https://example.com/leeds.png');
    });

    it('should set promotion from description', () => {
      const dto = normalizer.normalizeStanding(mockEntry, '40', 'Championship');
      expect(dto.promotion).toBe('Promotion - Premier League');
    });

    it('should set leagueId and leagueName', () => {
      const dto = normalizer.normalizeStanding(mockEntry, '40', 'Championship');
      expect(dto.leagueId).toBe('40');
      expect(dto.leagueName).toBe('Championship');
    });
  });

  describe('normalizePlayer', () => {
    const mockPlayer: RafPlayerResponse = {
      player: {
        id: 777,
        name: 'P. Bamford',
        firstname: 'Patrick',
        lastname: 'Bamford',
        age: 32,
        birth: { date: '1993-09-05', place: 'Grantham', country: 'England' },
        nationality: 'England',
        height: '185 cm',
        weight: '78 kg',
        injured: false,
        photo: 'https://example.com/players/777.png',
      },
      statistics: [
        {
          team: { id: 2627, name: 'Leeds United', logo: '' },
          league: {
            id: 40,
            name: 'Championship',
            country: 'England',
            logo: '',
            flag: '',
            season: 2025,
          },
          games: {
            appearences: 35,
            lineups: 30,
            minutes: 2700,
            number: 9,
            position: 'Attacker',
            rating: '7.2',
            captain: false,
          },
          goals: { total: 15, conceded: 0, assists: 7, saves: null },
          cards: { yellow: 3, yellowred: 0, red: 0 },
        },
      ],
    };

    it('should map externalId from player.id', () => {
      const dto = normalizer.normalizePlayer(mockPlayer);
      expect(dto.externalId).toBe('777');
    });

    it('should parse numeric stats', () => {
      const dto = normalizer.normalizePlayer(mockPlayer);
      expect(dto.goals).toBe(15);
      expect(dto.assists).toBe(7);
      expect(dto.yellowCards).toBe(3);
      expect(dto.redCards).toBe(0);
      expect(dto.matchesPlayed).toBe(35);
    });

    it('should set position from games.position', () => {
      const dto = normalizer.normalizePlayer(mockPlayer);
      expect(dto.position).toBe('Attacker');
    });

    it('should set rating', () => {
      const dto = normalizer.normalizePlayer(mockPlayer);
      expect(dto.rating).toBe('7.2');
    });

    it('should set teamId from statistics.team.id', () => {
      const dto = normalizer.normalizePlayer(mockPlayer);
      expect(dto.teamId).toBe('2627');
    });
  });
});
