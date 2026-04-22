import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { ApiFootballClient } from '../client/api-football.client';
import { ApiFootballNormalizer } from '../normalizer/api-football.normalizer';
import {
  SportsDataCacheService,
  TTL_TEAMS,
} from '../sports-data-cache.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AfTeam } from '../interfaces/api-football.interfaces';

const LEAGUE_IDS = ['152', '168']; // Championship, Ligue 2

@Injectable()
export class TeamsService {
  private readonly logger = new Logger(TeamsService.name);

  constructor(
    private readonly client: ApiFootballClient,
    private readonly normalizer: ApiFootballNormalizer,
    private readonly cacheService: SportsDataCacheService,
    private readonly prismaService: PrismaService,
  ) {}

  async getTeams(leagueId: string): Promise<AfTeam[]> {
    const cacheKey = SportsDataCacheService.teamsKey(leagueId);
    const cached = await this.cacheService.getCached<AfTeam[]>(cacheKey);
    if (cached) return cached;

    const raw = await this.client.get<AfTeam[]>('get_teams', {
      league_id: leagueId,
    });

    if (!Array.isArray(raw)) return [];

    await this.cacheService.setCached(cacheKey, raw, TTL_TEAMS);
    return raw;
  }

  async getTeamByExternalId(teamId: string): Promise<{
    id: string;
    externalId: string;
    name: string;
    logo: string | null;
    shortName: string | null;
    country: string | null;
  } | null> {
    return this.prismaService.team.findUnique({ where: { externalId: teamId } });
  }

  @Cron('0 3 * * *') // Once per day at 3 AM
  async refreshTeamsAndPlayers(): Promise<void> {
    for (const leagueId of LEAGUE_IDS) {
      try {
        this.logger.log(`Refreshing teams for league ${leagueId}`);
        await this.cacheService.invalidate(
          SportsDataCacheService.teamsKey(leagueId),
        );
        const teams = await this.getTeams(leagueId);
        await this.persistTeams(teams);
      } catch (err) {
        this.logger.error(
          `Failed to refresh teams for league ${leagueId}: ${String(err)}`,
        );
      }
    }
  }

  private async persistTeams(teams: AfTeam[]): Promise<void> {
    for (const raw of teams) {
      try {
        const team = await this.prismaService.team.upsert({
          where: { externalId: raw.team_key },
          create: {
            externalId: raw.team_key,
            name: raw.team_name,
            logo: raw.team_badge || null,
            country: raw.team_country || null,
          },
          update: {
            name: raw.team_name,
            logo: raw.team_badge || null,
            country: raw.team_country || null,
          },
        });

        for (const p of raw.players ?? []) {
          const playerDto = this.normalizer.normalizePlayer(p, raw.team_key);
          await this.prismaService.player.upsert({
            where: { externalId: playerDto.externalId },
            create: {
              externalId: playerDto.externalId,
              name: playerDto.name,
              image: playerDto.image,
              number: playerDto.number,
              position: playerDto.position,
              age: playerDto.age,
              teamId: team.id,
              goals: playerDto.goals,
              assists: playerDto.assists,
              yellowCards: playerDto.yellowCards,
              redCards: playerDto.redCards,
              matchesPlayed: playerDto.matchesPlayed,
              rating: playerDto.rating,
            },
            update: {
              name: playerDto.name,
              image: playerDto.image,
              number: playerDto.number,
              position: playerDto.position,
              age: playerDto.age,
              teamId: team.id,
              goals: playerDto.goals,
              assists: playerDto.assists,
              yellowCards: playerDto.yellowCards,
              redCards: playerDto.redCards,
              matchesPlayed: playerDto.matchesPlayed,
              rating: playerDto.rating,
            },
          });
        }
      } catch (err) {
        this.logger.error(
          `Failed to persist team ${raw.team_key}: ${String(err)}`,
        );
      }
    }
  }
}
