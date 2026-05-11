import { Injectable, Logger } from '@nestjs/common';
import { FootballDataOrgClient } from '../client/football-data-org.client';
import { FootballDataOrgNormalizer } from '../normalizer/football-data-org.normalizer';
import { SportsDataCacheService, TTL_LIVE } from '../sports-data-cache.service';
import { PrismaService } from '../../prisma/prisma.service';
import { FdoMatch, FdoMatchesResponse } from '../interfaces/football-data-org.interfaces';
import { MatchDto } from '../dto/match.dto';
import { LEAGUE_MAP } from '../constants/season.constants';

const TRACKED_FDO_CODES = Object.values(LEAGUE_MAP).map((v) => v.fdoCode);

@Injectable()
export class LivescoreService {
  private readonly logger = new Logger(LivescoreService.name);

  constructor(
    private readonly fdoClient: FootballDataOrgClient,
    private readonly fdoNormalizer: FootballDataOrgNormalizer,
    private readonly cacheService: SportsDataCacheService,
    private readonly prisma: PrismaService,
  ) {}

  async getCurrent(): Promise<MatchDto[]> {
    const cacheKey = SportsDataCacheService.livescoresKey();
    const cached = await this.cacheService.getCached<MatchDto[]>(cacheKey);
    if (cached) return cached;

    const today = new Date().toISOString().slice(0, 10);
    const allMatches: MatchDto[] = [];

    for (const fdoCode of TRACKED_FDO_CODES) {
      try {
        const data = await this.fdoClient.get<FdoMatchesResponse>(
          `competitions/${fdoCode}/matches`,
          { dateFrom: today, dateTo: today },
        );
        const normalized = await Promise.all(
          data.matches.map((m) => this.normalizeFdoMatch(m)),
        );
        allMatches.push(...normalized);
      } catch (err) {
        this.logger.warn(`Livescore fetch failed for ${fdoCode}: ${String(err)}`);
      }
    }

    const sorted = allMatches.sort(
      (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime(),
    );
    await this.cacheService.setCached(cacheKey, sorted, TTL_LIVE);
    return sorted;
  }

  private async normalizeFdoMatch(raw: FdoMatch): Promise<MatchDto> {
    const [homeTeam, awayTeam, league] = await Promise.all([
      this.prisma.team.findFirst({ where: { fdoExternalId: String(raw.homeTeam.id) } }),
      this.prisma.team.findFirst({ where: { fdoExternalId: String(raw.awayTeam.id) } }),
      this.prisma.league.findFirst({ where: { fdoExternalId: raw.competition.code } }),
    ]);
    return this.fdoNormalizer.normalizeMatch(
      raw,
      homeTeam?.externalId ?? null,
      awayTeam?.externalId ?? null,
      league?.externalId ?? null,
    );
  }
}
