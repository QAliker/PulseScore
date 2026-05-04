import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { ApiFootballClient } from '../client/api-football.client';
import { ApiFootballNormalizer } from '../normalizer/api-football.normalizer';
import {
  SportsDataCacheService,
  TTL_TEAMS,
} from '../sports-data-cache.service';
import { PrismaService } from '../../prisma/prisma.service';
import {
  RafTeamResponse,
  RafPlayerResponse,
} from '../interfaces/api-football.interfaces';

const LEAGUE_IDS = ['40', '61']; // Championship, Ligue 2
const SEASON = 2025;

@Injectable()
export class TeamsService implements OnModuleInit {
  private readonly logger = new Logger(TeamsService.name);

  constructor(
    private readonly client: ApiFootballClient,
    private readonly normalizer: ApiFootballNormalizer,
    private readonly cacheService: SportsDataCacheService,
    private readonly prismaService: PrismaService,
  ) {}

  async onModuleInit(): Promise<void> {
    const teamCount = await this.prismaService.team.count();
    if (teamCount === 0) {
      this.logger.log('DB missing teams — seeding on startup');
      void this.refreshTeams();
    }
  }

  async getTeams(leagueId: string): Promise<RafTeamResponse[]> {
    const cacheKey = SportsDataCacheService.teamsKey(leagueId);
    const cached = await this.cacheService.getCached<RafTeamResponse[]>(
      cacheKey,
    );
    if (cached) return cached;

    const raw = await this.client.get<RafTeamResponse>('teams', {
      league: leagueId,
      season: SEASON,
    });

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
    return this.prismaService.team.findUnique({
      where: { externalId: teamId },
    });
  }

  async fetchPlayersForTeam(teamId: string): Promise<void> {
    const playerCount = await this.prismaService.player.count({
      where: { team: { externalId: teamId } },
    });
    if (playerCount > 0) return;

    try {
      const raw = await this.client.get<RafPlayerResponse>('players', {
        team: teamId,
        season: SEASON,
      });

      const team = await this.prismaService.team.findUnique({
        where: { externalId: teamId },
      });
      if (!team) return;

      for (const entry of raw) {
        const dto = this.normalizer.normalizePlayer(entry);
        await this.prismaService.player.upsert({
          where: { externalId: dto.externalId },
          create: {
            externalId: dto.externalId,
            name: dto.name,
            image: dto.image,
            number: dto.number,
            position: dto.position,
            age: dto.age,
            teamId: team.id,
            goals: dto.goals,
            assists: dto.assists,
            yellowCards: dto.yellowCards,
            redCards: dto.redCards,
            matchesPlayed: dto.matchesPlayed,
            rating: dto.rating,
          },
          update: {
            name: dto.name,
            image: dto.image,
            number: dto.number,
            position: dto.position,
            age: dto.age,
            teamId: team.id,
            goals: dto.goals,
            assists: dto.assists,
            yellowCards: dto.yellowCards,
            redCards: dto.redCards,
            matchesPlayed: dto.matchesPlayed,
            rating: dto.rating,
          },
        });
      }
    } catch (err) {
      this.logger.error(
        `Failed to fetch players for team ${teamId}: ${String(err)}`,
      );
    }
  }

  @Cron('0 3 * * *')
  async refreshTeams(): Promise<void> {
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

  private async persistTeams(teams: RafTeamResponse[]): Promise<void> {
    for (const raw of teams) {
      try {
        await this.prismaService.team.upsert({
          where: { externalId: String(raw.team.id) },
          create: {
            externalId: String(raw.team.id),
            name: raw.team.name,
            logo: raw.team.logo || null,
            country: raw.team.country || null,
          },
          update: {
            name: raw.team.name,
            logo: raw.team.logo || null,
            country: raw.team.country || null,
          },
        });
      } catch (err) {
        this.logger.error(
          `Failed to persist team ${raw.team.id}: ${String(err)}`,
        );
      }
    }
  }
}
