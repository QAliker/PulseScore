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
import { MatchDto, LineupPlayerDto } from '../dto/match.dto';
import { PrismaService } from '../../prisma/prisma.service';
import {
  getCurrentSeason,
  HISTORY_SEASON_RAF,
  LEAGUE_MAP,
} from '../constants/season.constants';
import { EspnService } from './espn.service';
import { PlayerPhotoService } from './player-photo.service';
import { PlayersService, playerNameKeys } from './players.service';

const LEAGUE_IDS = ['39', '140', '78', '135', '61']; // PL, La Liga, Bundesliga, Serie A, Ligue 1

@Injectable()
export class FixturesService {
  private readonly logger = new Logger(FixturesService.name);
  private isPrewarming = false;

  constructor(
    private readonly rafClient: ApiFootballClient,
    private readonly rafNormalizer: ApiFootballNormalizer,
    private readonly fdoClient: FootballDataOrgClient,
    private readonly fdoNormalizer: FootballDataOrgNormalizer,
    private readonly cacheService: SportsDataCacheService,
    private readonly prisma: PrismaService,
    private readonly espnService: EspnService,
    private readonly playerPhotoService: PlayerPhotoService,
    private readonly playersService: PlayersService,
  ) {}

  private sleep(ms: number): Promise<void> {
    return new Promise((r) => setTimeout(r, ms));
  }

  private async resolveTeamByAnyId(teamId: string) {
    const rawFdoId = teamId.startsWith('fdo:') ? teamId.slice(4) : null;
    return this.prisma.team.findFirst({
      where: rawFdoId ? { fdoExternalId: rawFdoId } : { externalId: teamId },
    });
  }

  private async resolveTeamFdoCode(teamId: string): Promise<string | null> {
    const standing = await this.prisma.standing.findFirst({
      where: { teamId },
      include: { league: { select: { fdoExternalId: true } } },
      orderBy: { season: 'desc' },
    });
    return standing?.league?.fdoExternalId ?? null;
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

  /**
   * Rewrites match-lineup player ids (ESPN athlete ids, which have no player
   * page) to `fdo:personId` by matching player names against each team's FDO
   * squad. Players that can't be matched keep their original id and stay
   * non-clickable on the frontend. Best-effort: never throws.
   */
  private async linkLineupPlayersToFdo(
    match: MatchDto,
    homeFdoTeamId: string,
    awayFdoTeamId: string,
  ): Promise<void> {
    if (!match.lineups) return;
    const [homeMap, awayMap] = await Promise.all([
      this.playersService.getFdoSquadNameMap(homeFdoTeamId),
      this.playersService.getFdoSquadNameMap(awayFdoTeamId),
    ]);
    const apply = (
      players: LineupPlayerDto[],
      nameMap: Map<string, string>,
    ) => {
      for (const p of players) {
        for (const key of playerNameKeys(p.name)) {
          const fdoId = nameMap.get(key);
          if (fdoId) {
            p.id = fdoId;
            break;
          }
        }
      }
    };
    apply(
      [...match.lineups.home.starting, ...match.lineups.home.bench],
      homeMap,
    );
    apply(
      [...match.lineups.away.starting, ...match.lineups.away.bench],
      awayMap,
    );
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
        await this.linkLineupPlayersToFdo(
          match,
          String(raw.homeTeam.id),
          String(raw.awayTeam.id),
        );
      }
    } else {
      const raw = await this.rafClient.get<RafFixture>('fixtures', {
        id: matchId,
      });
      if (!raw.length) return null;
      match = this.rafNormalizer.normalizeFixture(raw[0]);
      if (
        !match.lineups &&
        match.homeTeam &&
        match.awayTeam &&
        match.league?.externalId
      ) {
        match.lineups = await this.espnService.getLineups(
          matchId,
          match.league.externalId,
          match.homeTeam.name,
          match.awayTeam.name,
          match.startTime,
        );
      }
    }

    if (match.lineups) {
      const allPlayers = [
        ...match.lineups.home.starting,
        ...match.lineups.home.bench,
        ...match.lineups.away.starting,
        ...match.lineups.away.bench,
      ];
      await this.playerPhotoService.enrichPhotos(allPlayers);
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
      const fdoCode = await this.resolveTeamFdoCode(team.id);
      if (!fdoCode) return [];
      const today = new Date().toISOString().slice(0, 10);
      const thirtyDaysAhead = new Date(Date.now() + 30 * 86400000)
        .toISOString()
        .slice(0, 10);
      const data = await this.fdoClient.get<FdoMatchesResponse>(
        `competitions/${fdoCode}/matches`,
        {
          team: team.fdoExternalId,
          dateFrom: today,
          dateTo: thirtyDaysAhead,
          status: 'SCHEDULED',
        },
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
      const fdoCode = await this.resolveTeamFdoCode(team.id);
      if (!fdoCode) return [];
      const today = new Date().toISOString().slice(0, 10);
      const ninetyDaysAgo = new Date(Date.now() - 90 * 86400000)
        .toISOString()
        .slice(0, 10);
      const data = await this.fdoClient.get<FdoMatchesResponse>(
        `competitions/${fdoCode}/matches`,
        {
          team: team.fdoExternalId,
          dateFrom: ninetyDaysAgo,
          dateTo: today,
          status: 'FINISHED',
        },
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

  async getAllLeagueMatches(leagueId: string): Promise<MatchDto[]> {
    const cacheKey = SportsDataCacheService.leagueMatchesKey(leagueId);
    const cached = await this.cacheService.getCached<MatchDto[]>(cacheKey);
    if (cached) return cached;

    const mapping = LEAGUE_MAP[leagueId];
    if (!mapping?.isCup) return [];

    const data = await this.fdoClient.get<FdoMatchesResponse>(
      `competitions/${mapping.fdoCode}/matches`,
    );
    const matches = (
      await Promise.all(data.matches.map((m) => this.normalizeFdoMatch(m)))
    ).sort(
      (a, b) =>
        new Date(a.startTime).getTime() - new Date(b.startTime).getTime(),
    );

    await this.cacheService.setCached(cacheKey, matches, TTL_FIXTURES);
    return matches;
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

  // FDO free tier: 10 calls/min → 6 s between each call
  private static readonly FDO_CALL_INTERVAL_MS = 6000;
  // Teams returning 403 are outside FDO free-tier competitions — skip for 24 h
  private static readonly FDO_FORBIDDEN_TTL = 24 * 60 * 60;

  private forbiddenKey(teamId: string): string {
    return `sports:prewarm:forbidden:${teamId}`;
  }

  private async fetchWithThrottle(
    fn: () => Promise<unknown>,
    teamId: string,
    label: string,
  ): Promise<'ok' | 'forbidden' | 'error'> {
    try {
      await fn();
      await this.sleep(FixturesService.FDO_CALL_INTERVAL_MS);
      return 'ok';
    } catch (err) {
      const msg = String(err);
      if (msg.includes('403')) {
        this.logger.debug(
          `${label} for ${teamId}: not in FDO free tier, marking forbidden`,
        );
        await this.cacheService.setCached(
          this.forbiddenKey(teamId),
          true,
          FixturesService.FDO_FORBIDDEN_TTL,
        );
        return 'forbidden';
      }
      this.logger.error(`${label} failed for ${teamId}: ${msg}`);
      await this.sleep(FixturesService.FDO_CALL_INTERVAL_MS);
      return 'error';
    }
  }

  @Cron('0 */6 * * *')
  async prewarmTeamFixtures(): Promise<void> {
    if (this.isPrewarming) {
      this.logger.warn('Prewarm already running, skipping');
      return;
    }
    this.isPrewarming = true;

    const teams = await this.prisma.team.findMany({
      where: {
        fdoExternalId: { not: null },
        standings: {
          some: { league: { externalId: { in: LEAGUE_IDS } } },
        },
      },
      select: { externalId: true, fdoExternalId: true },
    });

    this.logger.log(`Prewarm starting for ${teams.length} teams`);
    let warmed = 0;
    let skipped = 0;
    let forbidden = 0;

    try {
      for (const team of teams) {
        const [fixturesCached, resultsCached, squadCached, isForbidden] =
          await Promise.all([
            this.cacheService.getCached(
              SportsDataCacheService.teamFixturesKey(team.externalId),
            ),
            this.cacheService.getCached(
              SportsDataCacheService.teamResultsKey(team.externalId),
            ),
            this.cacheService.getCached(
              `sports:squad:fdo:${team.fdoExternalId}`,
            ),
            this.cacheService.getCached(this.forbiddenKey(team.externalId)),
          ]);

        if (isForbidden) {
          forbidden++;
          continue;
        }

        if (fixturesCached && resultsCached && squadCached) {
          skipped++;
          continue;
        }

        let teamForbidden = false;

        if (!fixturesCached) {
          const r = await this.fetchWithThrottle(
            () => this.getTeamFixtures(team.externalId),
            team.externalId,
            'fixtures',
          );
          if (r === 'forbidden') {
            teamForbidden = true;
          }
        }

        if (!teamForbidden && !resultsCached) {
          const r = await this.fetchWithThrottle(
            () => this.getTeamResults(team.externalId),
            team.externalId,
            'results',
          );
          if (r === 'forbidden') teamForbidden = true;
        }

        if (!teamForbidden && !squadCached) {
          await this.fetchWithThrottle(
            () => this.playersService.getByTeam(team.externalId),
            team.externalId,
            'squad',
          );
        }

        if (teamForbidden) {
          forbidden++;
        } else {
          warmed++;
        }
      }
    } finally {
      this.isPrewarming = false;
    }

    this.logger.log(
      `Prewarm complete: ${warmed} warmed, ${skipped} already cached, ${forbidden} forbidden (FDO paywall)`,
    );
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
