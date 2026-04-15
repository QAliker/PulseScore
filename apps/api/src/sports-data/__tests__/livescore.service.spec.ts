import {
  LivescoreService,
  ScoreChangeEvent,
} from '../services/livescore.service';
import { MatchDto, GoalscorerDto, CardDto } from '../dto/match.dto';
import { TeamDto } from '../dto/team.dto';

function makeMatchDto(
  overrides: Partial<MatchDto> & { externalId: string },
): MatchDto {
  const dto = new MatchDto();
  const home = new TeamDto();
  home.id = 'home1';
  home.externalId = 'home1';
  home.name = overrides.homeTeam?.name ?? 'Home FC';
  home.logo = null;

  const away = new TeamDto();
  away.id = 'away1';
  away.externalId = 'away1';
  away.name = overrides.awayTeam?.name ?? 'Away FC';
  away.logo = null;

  dto.id = overrides.externalId;
  dto.externalId = overrides.externalId;
  dto.homeTeam = home;
  dto.awayTeam = away;
  dto.homeScore = overrides.homeScore ?? 0;
  dto.awayScore = overrides.awayScore ?? 0;
  dto.status = overrides.status ?? 'LIVE';
  dto.sport = 'Football';
  dto.league = null;
  dto.startTime = new Date('2026-04-10T20:45:00Z');
  dto.progress = null;
  dto.venue = null;
  dto.round = null;
  dto.goalscorers = [];
  dto.cards = [];

  return dto;
}

describe('LivescoreService — detectChanges', () => {
  let service: LivescoreService;

  beforeEach(() => {
    service = new LivescoreService(
      null as never,
      null as never,
      null as never,
      null as never,
    );
  });

  it('should return no changes when previous is empty', () => {
    const current = [
      makeMatchDto({ externalId: 'evt1', homeScore: 1, awayScore: 0 }),
    ];
    const changes = service.detectChanges(current, []);
    expect(changes).toHaveLength(0);
  });

  it('should return no changes when scores are unchanged', () => {
    const current = [
      makeMatchDto({ externalId: 'evt1', homeScore: 2, awayScore: 1 }),
    ];
    const previous = [
      makeMatchDto({ externalId: 'evt1', homeScore: 2, awayScore: 1 }),
    ];
    const changes = service.detectChanges(current, previous);
    expect(changes).toHaveLength(0);
  });

  it('should detect a home score change', () => {
    const current = [
      makeMatchDto({ externalId: 'evt1', homeScore: 2, awayScore: 1 }),
    ];
    const previous = [
      makeMatchDto({ externalId: 'evt1', homeScore: 1, awayScore: 1 }),
    ];
    const changes = service.detectChanges(current, previous);
    expect(changes).toHaveLength(1);
    expect(changes[0].newScore).toEqual({ home: 2, away: 1 });
  });

  it('should detect an away score change', () => {
    const current = [
      makeMatchDto({ externalId: 'evt1', homeScore: 0, awayScore: 1 }),
    ];
    const previous = [
      makeMatchDto({ externalId: 'evt1', homeScore: 0, awayScore: 0 }),
    ];
    const changes = service.detectChanges(current, previous);
    expect(changes).toHaveLength(1);
  });

  it('should detect status change to FINISHED', () => {
    const current = [
      makeMatchDto({
        externalId: 'evt1',
        homeScore: 2,
        awayScore: 1,
        status: 'FINISHED',
      }),
    ];
    const previous = [
      makeMatchDto({
        externalId: 'evt1',
        homeScore: 2,
        awayScore: 1,
        status: 'LIVE',
      }),
    ];
    const changes = service.detectChanges(current, previous);
    expect(changes).toHaveLength(1);
    expect(changes[0].statusChanged).toBe(true);
  });

  it('should not report new matches as changes', () => {
    const current = [
      makeMatchDto({ externalId: 'evt1', homeScore: 1, awayScore: 0 }),
      makeMatchDto({ externalId: 'evt2', homeScore: 0, awayScore: 0 }),
    ];
    const previous = [
      makeMatchDto({ externalId: 'evt1', homeScore: 1, awayScore: 0 }),
    ];
    const changes = service.detectChanges(current, previous);
    expect(changes).toHaveLength(0);
  });

  it('should detect multiple changes', () => {
    const current = [
      makeMatchDto({ externalId: 'evt1', homeScore: 2, awayScore: 0 }),
      makeMatchDto({ externalId: 'evt2', homeScore: 1, awayScore: 3 }),
    ];
    const previous = [
      makeMatchDto({ externalId: 'evt1', homeScore: 1, awayScore: 0 }),
      makeMatchDto({ externalId: 'evt2', homeScore: 1, awayScore: 2 }),
    ];
    const changes = service.detectChanges(current, previous);
    expect(changes).toHaveLength(2);
  });
});
