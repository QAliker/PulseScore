import { Injectable } from '@nestjs/common';
import { FootballDataOrgClient } from '../client/football-data-org.client';
import {
  SportsDataCacheService,
  TTL_STANDINGS,
} from '../sports-data-cache.service';
import { PrismaService } from '../../prisma/prisma.service';
import { FdoScorersResponse } from '../interfaces/football-data-org.interfaces';
import { ScorerDto } from '../dto/scorer.dto';
import { LEAGUE_MAP } from '../constants/season.constants';

@Injectable()
export class ScorersService {
  constructor(
    private readonly fdoClient: FootballDataOrgClient,
    private readonly cacheService: SportsDataCacheService,
    private readonly prisma: PrismaService,
  ) {}

  async getByLeague(leagueId: string): Promise<ScorerDto[]> {
    const cacheKey = SportsDataCacheService.scorersKey(leagueId);
    const cached = await this.cacheService.getCached<ScorerDto[]>(cacheKey);
    if (cached) return cached;

    const mapping = LEAGUE_MAP[leagueId];
    if (!mapping) return [];

    const data = await this.fdoClient.get<FdoScorersResponse>(
      `competitions/${mapping.fdoCode}/scorers`,
      { limit: 30 },
    );

    const scorers = await Promise.all(
      data.scorers.map(async (s, i) => {
        const team = await this.prisma.team.findFirst({
          where: { fdoExternalId: String(s.team.id) },
          select: { externalId: true },
        });
        const dto = new ScorerDto();
        dto.rank = i + 1;
        dto.playerId = s.player.id;
        dto.playerName = s.player.name;
        dto.nationality = s.player.nationality ?? null;
        dto.position = s.player.position ?? s.player.section ?? null;
        dto.teamId = team?.externalId ?? null;
        dto.teamName = s.team.name;
        dto.teamCrest = s.team.crest || null;
        dto.playedMatches = s.playedMatches;
        dto.goals = s.goals;
        dto.assists = s.assists ?? null;
        dto.penalties = s.penalties ?? null;
        return dto;
      }),
    );

    await this.cacheService.setCached(cacheKey, scorers, TTL_STANDINGS);
    return scorers;
  }
}
