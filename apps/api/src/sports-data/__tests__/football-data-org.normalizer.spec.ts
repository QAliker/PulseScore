import { FootballDataOrgNormalizer } from '../normalizer/football-data-org.normalizer';
import {
  FdoMatch,
  FdoStanding,
} from '../interfaces/football-data-org.interfaces';

describe('FootballDataOrgNormalizer', () => {
  let normalizer: FootballDataOrgNormalizer;

  beforeEach(() => {
    normalizer = new FootballDataOrgNormalizer();
  });

  const fdoMatch: FdoMatch = {
    id: 496380,
    utcDate: '2025-08-16T14:00:00Z',
    status: 'FINISHED',
    matchday: 1,
    homeTeam: {
      id: 64,
      name: 'Liverpool FC',
      crest: 'https://crests.football-data.org/64.png',
    },
    awayTeam: {
      id: 66,
      name: 'Manchester United FC',
      crest: 'https://crests.football-data.org/66.png',
    },
    score: {
      winner: 'HOME_TEAM',
      fullTime: { home: 3, away: 1 },
      halfTime: { home: 1, away: 0 },
    },
    competition: { id: 2021, name: 'Premier League', code: 'PL' },
  };

  describe('normalizeStatus', () => {
    it('maps FINISHED', () =>
      expect(normalizer.normalizeStatus('FINISHED')).toBe('FINISHED'));
    it('maps IN_PLAY to LIVE', () =>
      expect(normalizer.normalizeStatus('IN_PLAY')).toBe('LIVE'));
    it('maps PAUSED to LIVE', () =>
      expect(normalizer.normalizeStatus('PAUSED')).toBe('LIVE'));
    it('maps POSTPONED', () =>
      expect(normalizer.normalizeStatus('POSTPONED')).toBe('POSTPONED'));
    it('maps CANCELLED', () =>
      expect(normalizer.normalizeStatus('CANCELLED')).toBe('CANCELLED'));
    it('maps SUSPENDED to CANCELLED', () =>
      expect(normalizer.normalizeStatus('SUSPENDED')).toBe('CANCELLED'));
    it('maps SCHEDULED', () =>
      expect(normalizer.normalizeStatus('SCHEDULED')).toBe('SCHEDULED'));
  });

  describe('normalizeMatch', () => {
    it('maps FDO match to MatchDto with fdo: prefixed id', () => {
      const dto = normalizer.normalizeMatch(
        fdoMatch,
        'raf-liverpool-id',
        'raf-manutd-id',
        'raf-pl-id',
      );
      expect(dto.id).toBe('fdo:496380');
      expect(dto.externalId).toBe('fdo:496380');
      expect(dto.status).toBe('FINISHED');
      expect(dto.homeScore).toBe(3);
      expect(dto.awayScore).toBe(1);
      expect(dto.homeTeam.id).toBe('raf-liverpool-id');
      expect(dto.homeTeam.name).toBe('Liverpool FC');
      expect(dto.homeTeam.logo).toBe('https://crests.football-data.org/64.png');
      expect(dto.awayTeam.id).toBe('raf-manutd-id');
      expect(dto.round).toBe(1);
      expect(dto.sport).toBe('Football');
    });

    it('falls back to fdo: prefixed team id when resolvedId is null', () => {
      const dto = normalizer.normalizeMatch(fdoMatch, null, null, null);
      expect(dto.homeTeam.id).toBe('fdo:64');
      expect(dto.awayTeam.id).toBe('fdo:66');
      expect(dto.league!.id).toBe('fdo:PL');
    });
  });

  describe('normalizeStanding', () => {
    const fdoStanding: FdoStanding = {
      position: 1,
      team: { id: 64, name: 'Liverpool FC', crest: 'https://...' },
      playedGames: 5,
      won: 4,
      draw: 1,
      lost: 0,
      goalsFor: 12,
      goalsAgainst: 3,
      points: 13,
      form: 'WWWDW',
    };

    it('maps FDO standing to StandingDto', () => {
      const dto = normalizer.normalizeStanding(
        fdoStanding,
        'internal-pl-id',
        'Premier League',
        'raf-liverpool-id',
      );
      expect(dto.position).toBe(1);
      expect(dto.played).toBe(5);
      expect(dto.won).toBe(4);
      expect(dto.drawn).toBe(1);
      expect(dto.lost).toBe(0);
      expect(dto.goalsFor).toBe(12);
      expect(dto.goalsAgainst).toBe(3);
      expect(dto.points).toBe(13);
      expect(dto.teamId).toBe('raf-liverpool-id');
      expect(dto.leagueId).toBe('internal-pl-id');
    });
  });
});
