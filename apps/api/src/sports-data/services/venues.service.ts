import { Injectable } from '@nestjs/common';
import { ApiFootballClient } from '../client/api-football.client';
import { FootballDataOrgClient } from '../client/football-data-org.client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  SportsDataCacheService,
  TTL_TEAMS,
} from '../sports-data-cache.service';
import {
  RafTeamResponse,
  RafVenueResponse,
} from '../interfaces/api-football.interfaces';
import type { FdoTeamDetail } from '../interfaces/football-data-org.interfaces';
import { VenueDto } from '../dto/venue.dto';

@Injectable()
export class VenuesService {
  constructor(
    private readonly client: ApiFootballClient,
    private readonly fdoClient: FootballDataOrgClient,
    private readonly prisma: PrismaService,
    private readonly cacheService: SportsDataCacheService,
  ) {}

  async getByTeam(teamId: string): Promise<VenueDto[]> {
    const cacheKey = `sports:venues:team:${teamId}`;
    const cached = await this.cacheService.getCached<VenueDto[]>(cacheKey);
    if (cached) return cached;

    const rawFdoId = teamId.startsWith('fdo:') ? teamId.slice(4) : null;
    const team = await this.prisma.team.findFirst({
      where: rawFdoId
        ? { fdoExternalId: rawFdoId }
        : { OR: [{ externalId: teamId }, { fdoExternalId: teamId }] },
      select: { fdoExternalId: true },
    });

    const fdoId = team?.fdoExternalId;
    if (!fdoId) return [];

    const detailKey = SportsDataCacheService.fdoTeamDetailKey(fdoId);
    let detail = await this.cacheService.getCached<FdoTeamDetail>(detailKey);
    if (!detail) {
      detail = await this.fdoClient
        .get<FdoTeamDetail>(`teams/${fdoId}`)
        .catch(() => null);
      if (detail)
        await this.cacheService.setCached(detailKey, detail, TTL_TEAMS);
    }
    if (!detail?.venue) return [];

    const dto = new VenueDto();
    dto.id = detail.id;
    dto.name = detail.venue;
    dto.address = null;
    dto.city = null;
    dto.country = null;
    dto.capacity = null;
    dto.surface = null;
    dto.image = null;
    const venues = [dto];
    await this.cacheService.setCached(cacheKey, venues, TTL_TEAMS);
    return venues;
  }

  async getByLeague(leagueId: string, season: number): Promise<VenueDto[]> {
    const cacheKey = `sports:venues:league:${leagueId}:${season}`;
    const cached = await this.cacheService.getCached<VenueDto[]>(cacheKey);
    if (cached) return cached;

    const raw = await this.client.get<RafTeamResponse>('teams', {
      league: leagueId,
      season,
    });

    const venues = raw
      .map((r) => this.teamVenueToDto(r))
      .filter((v): v is VenueDto => v !== null);

    await this.cacheService.setCached(cacheKey, venues, TTL_TEAMS);
    return venues;
  }

  async search(params: {
    city?: string;
    country?: string;
    name?: string;
    search?: string;
  }): Promise<VenueDto[]> {
    const cacheKey = `sports:venues:search:${JSON.stringify(params)}`;
    const cached = await this.cacheService.getCached<VenueDto[]>(cacheKey);
    if (cached) return cached;

    const queryParams: Record<string, string | number> = {};
    if (params.city) queryParams.city = params.city;
    if (params.country) queryParams.country = params.country;
    if (params.name) queryParams.name = params.name;
    if (params.search) queryParams.search = params.search;

    const raw = await this.client.get<RafVenueResponse>('venues', queryParams);
    const venues = raw.map((r) => this.venueResponseToDto(r));
    await this.cacheService.setCached(cacheKey, venues, TTL_TEAMS);
    return venues;
  }

  async getById(venueId: string): Promise<VenueDto | null> {
    const cacheKey = `sports:venues:${venueId}`;
    const cached = await this.cacheService.getCached<VenueDto>(cacheKey);
    if (cached) return cached;

    const raw = await this.client.get<RafVenueResponse>('venues', {
      id: venueId,
    });

    if (!raw.length) return null;
    const dto = this.venueResponseToDto(raw[0]);
    await this.cacheService.setCached(cacheKey, dto, TTL_TEAMS);
    return dto;
  }

  private teamVenueToDto(r: RafTeamResponse): VenueDto | null {
    if (!r.venue.id && !r.venue.name) return null;
    const dto = new VenueDto();
    dto.id = r.venue.id ?? 0;
    dto.name = r.venue.name ?? '';
    dto.address = r.venue.address;
    dto.city = r.venue.city;
    dto.country = r.team.country || null;
    dto.capacity = r.venue.capacity;
    dto.surface = r.venue.surface;
    dto.image = r.venue.image;
    return dto;
  }

  private venueResponseToDto(r: RafVenueResponse): VenueDto {
    const dto = new VenueDto();
    dto.id = r.id;
    dto.name = r.name;
    dto.address = r.address;
    dto.city = r.city;
    dto.country = r.country;
    dto.capacity = r.capacity;
    dto.surface = r.surface;
    dto.image = r.image;
    return dto;
  }
}
