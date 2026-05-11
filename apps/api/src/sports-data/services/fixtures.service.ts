import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { ApiFootballClient } from '../client/api-football.client';
import { ApiFootballNormalizer } from '../normalizer/api-football.normalizer';
import { FootballDataOrgClient } from '../client/football-data-org.client';
import { FootballDataOrgNormalizer } from '../normalizer/football-data-org.normalizer';
import {
  SportsDataCacheService,
  TTL_FIXTURES,
} from '../sports-data-cache.service';
import { RafFixture } from '../interfaces/api-football.interfaces';
import {
  FdoMatch,
  FdoMatchesResponse,
} from '../interfaces/football-data-org.interfaces';
import { MatchDto } from '../dto/match.dto';
import { PrismaService } from '../../prisma/prisma.service';
import {
  getCurrentSeason,
  HISTORY_SEASON_RAF,
  LEAGUE_MAP,
} from '../constants/season.constants';
import { EspnService } from './espn.service';

const LEAGUE_IDS = ['39', '140', '78', '135', '61']; // PL, La Liga, Bundesliga, Serie A, Ligue 1

@Injectable()
export class FixturesService {
  private readonly logger = new Logger(FixturesService.name);

  constructor(
    private readonly rafClient: ApiFootballClient,
    private readonly rafNormalizer: ApiFootballNormalizer,
    private readonly fdoClient: FootballDataOrgClient,
    private readonly fdoNormalizer: FootballDataOrgNormalizer,
    private readonly cacheService: SportsDataCacheService,
    private readonly prisma: PrismaService,
    private readonly espnService: EspnService,
  ) {}

  private async resolveTeamByAnyId(teamId: string) {
    const rawFdoId = teamId.startsWith('fdo:') ? teamId.slice(4) : null;
    return this.prisma.team.findFirst({
      where: rawFdoId
        ? { fdoExternalId: rawFdoId }
        : { OR: [{ externalId: teamId }, { fdoExternalId: teamId }] },
    });
  }

  private async resolveTeamId(fdoTeamId: number): Promise<string | null> {
    const team = await this.prisma.team.findFirst({
      where: { fdoExternalId: String(fdoTeamId) },
    });
    return team?.externalId ?? null;
  }

  private async resolveLeagueId(fdoCode: string): Promise<string | null> {
    const league = await this.prisma.league.findFirst({
      where: { fdoExternalId: fdoCode },
    });
    return league?.externalId ?? null;
  }

  private async normalizeFdoMatch(raw: FdoMatch): Promise<MatchDto> {
    const [homeId, awayId, leagueId] = await Promise.all([
      this.resolveTeamId(raw.homeTeam.id),
      this.resolveTeamId(raw.awayTeam.id),
      this.resolveLeagueId(raw.competition.code),
    ]);
    return this.fdoNormalizer.normalizeMatch(raw, homeId, awayId, leagueId);
  }

  async getFixtures(
    leagueId: string,
    from: string,
    to: string,
  ): Promise<MatchDto[]> {
    const cacheKey = SportsDataCacheService.fixturesKey(leagueId, from, to);
    const cached = await this.cacheService.getCached<MatchDto[]>(cacheKey);
    if (cached) return cached;

    const season = getCurrentSeason();
    let fixtures: MatchDto[];

    if (season >= 2025) {
      const mapping = LEAGUE_MAP[leagueId];
      if (!mapping) return [];
      const data = await this.fdoClient.get<FdoMatchesResponse>(
        `competitions/${mapping.fdoCode}/matches`,
        { dateFrom: from, dateTo: to },
      );
      fixtures = await Promise.all(
        data.matches.map((m) => this.normalizeFdoMatch(m)),
      );
    } else {
      const raw = await this.rafClient.get<RafFixture>('fixtures', {
        league: leagueId,
        season: HISTORY_SEASON_RAF,
        from,
        to,
      });
      fixtures = raw.map((m) => this.rafNormalizer.normalizeFixture(m));
    }

    await this.cacheService.setCached(cacheKey, fixtures, TTL_FIXTURES);
    return fixtures;
  }

  async getMatchById(matchId: string): Promise<MatchDto | null> {
    const cacheKey = `sports:match:${matchId}`;
    const cached = await this.cacheService.getCached<MatchDto>(cacheKey);
    if (cached) return cached;

    let match: MatchDto | null;

    if (matchId.startsWith('fdo:')) {
      const fdoId = matchId.slice(4);
      const raw = await this.fdoClient.get<FdoMatch>(`matches/${fdoId}`);
      match = await this.normalizeFdoMatch(raw);
      if (match.homeTeam && match.awayTeam && match.league?.externalId) {
        match.lineups = await this.espnService.getLineups(
          matchId,
          match.league.externalId,
          match.homeTeam.name,
          match.awayTeam.name,
          match.startTime,
        );
      }
    } else {
      const raw = await this.rafClient.get<RafFixture>('fixtures', {
        id: matchId,
      });
      if (!raw.length) return null;
      match = this.rafNormalizer.normalizeFixture(raw[0]);
      await this.enrichLineupPhotos(match);
    }

    const ttl =
      match.status === 'LIVE' ? 30 : match.status === 'FINISHED' ? 3600 : 300;
    await this.cacheService.setCached(cacheKey, match, ttl);
    return match;
  }

  async getTeamFixtures(teamId: string): Promise<MatchDto[]> {
    const cacheKey = SportsDataCacheService.teamFixturesKey(teamId);
    const cached = await this.cacheService.getCached<MatchDto[]>(cacheKey);
    if (cached) return cached;

    const season = getCurrentSeason();
    let fixtures: MatchDto[];

    if (season >= 2025) {
      const team = await this.resolveTeamByAnyId(teamId);
      if (!team?.fdoExternalId) return [];
      const today = new Date().toISOString().slice(0, 10);
      const thirtyDaysAhead = new Date(Date.now() + 30 * 86400000)
        .toISOString()
        .slice(0, 10);
      const data = await this.fdoClient.get<FdoMatchesResponse>(
        `teams/${team.fdoExternalId}/matches`,
        { dateFrom: today, dateTo: thirtyDaysAhead, status: 'SCHEDULED' },
      );
      fixtures = (
        await Promise.all(data.matches.map((m) => this.normalizeFdoMatch(m)))
      ).sort(
        (a, b) =>
          new Date(a.startTime).getTime() - new Date(b.startTime).getTime(),
      );
    } else {
      const today = new Date().toISOString().slice(0, 10);
      const thirtyDaysAhead = new Date(Date.now() + 30 * 86400000)
        .toISOString()
        .slice(0, 10);
      const raw = await this.rafClient.get<RafFixture>('fixtures', {
        team: teamId,
        season: HISTORY_SEASON_RAF,
        from: today,
        to: thirtyDaysAhead,
      });
      fixtures = raw
        .map((m) => this.rafNormalizer.normalizeFixture(m))
        .filter((m) => m.status === 'SCHEDULED')
        .sort(
          (a, b) =>
            new Date(a.startTime).getTime() - new Date(b.startTime).getTime(),
        );
    }

    await this.cacheService.setCached(cacheKey, fixtures, TTL_FIXTURES);
    return fixtures;
  }

  async getTeamResults(
    teamId: string,
    limit = 10,
    offset = 0,
  ): Promise<MatchDto[]> {
    const cacheKey = SportsDataCacheService.teamResultsKey(teamId);
    const cached = await this.cacheService.getCached<MatchDto[]>(cacheKey);
    if (cached) return cached.slice(offset, offset + limit);

    const season = getCurrentSeason();
    let results: MatchDto[];

    if (season >= 2025) {
      const team = await this.resolveTeamByAnyId(teamId);
      if (!team?.fdoExternalId) return [];
      const today = new Date().toISOString().slice(0, 10);
      const ninetyDaysAgo = new Date(Date.now() - 90 * 86400000)
        .toISOString()
        .slice(0, 10);
      const data = await this.fdoClient.get<FdoMatchesResponse>(
        `teams/${team.fdoExternalId}/matches`,
        { dateFrom: ninetyDaysAgo, dateTo: today, status: 'FINISHED' },
      );
      results = (
        await Promise.all(data.matches.map((m) => this.normalizeFdoMatch(m)))
      ).sort(
        (a, b) =>
          new Date(b.startTime).getTime() - new Date(a.startTime).getTime(),
      );
    } else {
      const today = new Date().toISOString().slice(0, 10);
      const ninetyDaysAgo = new Date(Date.now() - 90 * 86400000)
        .toISOString()
        .slice(0, 10);
      const raw = await this.rafClient.get<RafFixture>('fixtures', {
        team: teamId,
        season: HISTORY_SEASON_RAF,
        from: ninetyDaysAgo,
        to: today,
      });
      results = raw
        .map((m) => this.rafNormalizer.normalizeFixture(m))
        .filter((m) => m.status === 'FINISHED')
        .sort(
          (a, b) =>
            new Date(b.startTime).getTime() - new Date(a.startTime).getTime(),
        );
    }

    await this.cacheService.setCached(cacheKey, results, TTL_FIXTURES);
    return results.slice(offset, offset + limit);
  }

  async getLeagueFixtures(leagueId: string): Promise<MatchDto[]> {
    const cacheKey = SportsDataCacheService.leagueFixturesKey(leagueId);
    const cached = await this.cacheService.getCached<MatchDto[]>(cacheKey);
    if (cached) return cached;

    const season = getCurrentSeason();
    let fixtures: MatchDto[];

    if (season >= 2025) {
      const mapping = LEAGUE_MAP[leagueId];
      if (!mapping) return [];
      const today = new Date().toISOString().slice(0, 10);
      const thirtyDaysAhead = new Date(Date.now() + 30 * 86400000)
        .toISOString()
        .slice(0, 10);
      const data = await this.fdoClient.get<FdoMatchesResponse>(
        `competitions/${mapping.fdoCode}/matches`,
        { dateFrom: today, dateTo: thirtyDaysAhead, status: 'SCHEDULED' },
      );
      fixtures = (
        await Promise.all(data.matches.map((m) => this.normalizeFdoMatch(m)))
      ).sort(
        (a, b) =>
          new Date(a.startTime).getTime() - new Date(b.startTime).getTime(),
      );
    } else {
      const today = new Date().toISOString().slice(0, 10);
      const thirtyDaysAhead = new Date(Date.now() + 30 * 86400000)
        .toISOString()
        .slice(0, 10);
      const raw = await this.rafClient.get<RafFixture>('fixtures', {
        league: leagueId,
        season: HISTORY_SEASON_RAF,
        from: today,
        to: thirtyDaysAhead,
      });
      fixtures = raw
        .map((m) => this.rafNormalizer.normalizeFixture(m))
        .filter((m) => m.status === 'SCHEDULED')
        .sort(
          (a, b) =>
            new Date(a.startTime).getTime() - new Date(b.startTime).getTime(),
        );
    }

    await this.cacheService.setCached(cacheKey, fixtures, TTL_FIXTURES);
    return fixtures;
  }

  async getLeagueResults(leagueId: string): Promise<MatchDto[]> {
    const cacheKey = SportsDataCacheService.leagueResultsKey(leagueId);
    const cached = await this.cacheService.getCached<MatchDto[]>(cacheKey);
    if (cached) return cached;

    const season = getCurrentSeason();
    let results: MatchDto[];

    if (season >= 2025) {
      const mapping = LEAGUE_MAP[leagueId];
      if (!mapping) return [];
      const today = new Date().toISOString().slice(0, 10);
      const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000)
        .toISOString()
        .slice(0, 10);
      const data = await this.fdoClient.get<FdoMatchesResponse>(
        `competitions/${mapping.fdoCode}/matches`,
        { dateFrom: thirtyDaysAgo, dateTo: today, status: 'FINISHED' },
      );
      results = (
        await Promise.all(data.matches.map((m) => this.normalizeFdoMatch(m)))
      ).sort(
        (a, b) =>
          new Date(b.startTime).getTime() - new Date(a.startTime).getTime(),
      );
    } else {
      const today = new Date().toISOString().slice(0, 10);
      const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000)
        .toISOString()
        .slice(0, 10);
      const raw = await this.rafClient.get<RafFixture>('fixtures', {
        league: leagueId,
        season: HISTORY_SEASON_RAF,
        from: thirtyDaysAgo,
        to: today,
      });
      results = raw
        .map((m) => this.rafNormalizer.normalizeFixture(m))
        .filter((m) => m.status === 'FINISHED')
        .sort(
          (a, b) =>
            new Date(b.startTime).getTime() - new Date(a.startTime).getTime(),
        );
    }

    await this.cacheService.setCached(cacheKey, results, TTL_FIXTURES);
    return results;
  }

  private async enrichLineupPhotos(match: MatchDto): Promise<void> {
    if (!match.lineups) return;
    const allPlayers = [
      ...match.lineups.home.starting,
      ...match.lineups.home.bench,
      ...match.lineups.away.starting,
      ...match.lineups.away.bench,
    ];
    const ids = allPlayers.map((p) => p.id).filter(Boolean);
    if (ids.length === 0) return;
    const rows = await this.prisma.player.findMany({
      where: { externalId: { in: ids } },
      select: { externalId: true, image: true },
    });
    const photoMap = new Map(rows.map((r) => [r.externalId, r.image]));
    for (const p of allPlayers) {
      p.photo = photoMap.get(p.id) ?? null;
    }
  }

  @Cron('0 */12 * * *')
  async refreshFixtures(): Promise<void> {
    const today = new Date().toISOString().slice(0, 10);
    const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);
    for (const leagueId of LEAGUE_IDS) {
      try {
        this.logger.log(`Refreshing fixtures for league ${leagueId}`);
        await this.cacheService.invalidate(
          SportsDataCacheService.fixturesKey(leagueId, today, nextWeek),
        );
        await this.getFixtures(leagueId, today, nextWeek);
      } catch (err) {
        this.logger.error(
          `Failed to refresh fixtures for league ${leagueId}: ${String(err)}`,
        );
      }
    }
  }
}
