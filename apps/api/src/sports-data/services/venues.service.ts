import { Injectable } from '@nestjs/common';
import { ApiFootballClient } from '../client/api-football.client';
import {
  SportsDataCacheService,
  TTL_TEAMS,
} from '../sports-data-cache.service';
import { RafVenueResponse } from '../interfaces/api-football.interfaces';
import { VenueDto } from '../dto/venue.dto';

@Injectable()
export class VenuesService {
  constructor(
    private readonly client: ApiFootballClient,
    private readonly cacheService: SportsDataCacheService,
  ) {}

  async getByTeam(teamId: string): Promise<VenueDto[]> {
    const cacheKey = `sports:venues:team:${teamId}`;
    const cached = await this.cacheService.getCached<VenueDto[]>(cacheKey);
    if (cached) return cached;

    const raw = await this.client.get<RafVenueResponse>('venues', {
      team: teamId,
    });

    const venues = raw.map((r) => this.toDto(r));
    await this.cacheService.setCached(cacheKey, venues, TTL_TEAMS);
    return venues;
  }

  async getByLeague(leagueId: string, season: number): Promise<VenueDto[]> {
    const cacheKey = `sports:venues:league:${leagueId}:${season}`;
    const cached = await this.cacheService.getCached<VenueDto[]>(cacheKey);
    if (cached) return cached;

    const raw = await this.client.get<RafVenueResponse>('venues', {
      league: leagueId,
      season,
    });

    const venues = raw.map((r) => this.toDto(r));
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
    const dto = this.toDto(raw[0]);
    await this.cacheService.setCached(cacheKey, dto, TTL_TEAMS);
    return dto;
  }

  private toDto(r: RafVenueResponse): VenueDto {
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
