import { Injectable, Logger } from '@nestjs/common';
import { ApiFootballClient } from '../client/api-football.client';
import {
  SportsDataCacheService,
  TTL_TEAMS,
} from '../sports-data-cache.service';
import { RafCoachResponse } from '../interfaces/api-football.interfaces';
import { CoachDto, CoachCareerDto } from '../dto/coach.dto';

@Injectable()
export class CoachesService {
  private readonly logger = new Logger(CoachesService.name);

  constructor(
    private readonly client: ApiFootballClient,
    private readonly cacheService: SportsDataCacheService,
  ) {}

  async getByTeam(teamId: string): Promise<CoachDto[]> {
    const cacheKey = `sports:coaches:team:${teamId}`;
    const cached = await this.cacheService.getCached<CoachDto[]>(cacheKey);
    if (cached) return cached;

    const raw = await this.client.get<RafCoachResponse>('coachs', {
      team: teamId,
    });

    const coaches = raw.map((r) => this.toDto(r));
    await this.cacheService.setCached(cacheKey, coaches, TTL_TEAMS);
    return coaches;
  }

  async getById(coachId: string): Promise<CoachDto | null> {
    const cacheKey = `sports:coaches:${coachId}`;
    const cached = await this.cacheService.getCached<CoachDto>(cacheKey);
    if (cached) return cached;

    const raw = await this.client.get<RafCoachResponse>('coachs', {
      id: coachId,
    });

    if (!raw.length) return null;
    const dto = this.toDto(raw[0]);
    await this.cacheService.setCached(cacheKey, dto, TTL_TEAMS);
    return dto;
  }

  private toDto(r: RafCoachResponse): CoachDto {
    const dto = new CoachDto();
    dto.id = r.id;
    dto.name = r.name;
    dto.firstname = r.firstname;
    dto.lastname = r.lastname;
    dto.age = r.age;
    dto.nationality = r.nationality;
    dto.photo = r.photo;
    dto.teamId = r.team?.id ?? null;
    dto.teamName = r.team?.name ?? null;
    dto.teamLogo = r.team?.logo ?? null;
    dto.career = (r.career ?? []).map((c) => {
      const entry = new CoachCareerDto();
      entry.teamId = c.team.id;
      entry.teamName = c.team.name;
      entry.teamLogo = c.team.logo;
      entry.start = c.start;
      entry.end = c.end;
      return entry;
    });
    return dto;
  }
}
