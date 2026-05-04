import { Injectable } from '@nestjs/common';
import { ApiFootballClient } from '../client/api-football.client';
import {
  SportsDataCacheService,
  TTL_TEAMS,
} from '../sports-data-cache.service';
import { RafCountryResponse } from '../interfaces/api-football.interfaces';
import { CountryDto } from '../dto/country.dto';

@Injectable()
export class CountriesService {
  constructor(
    private readonly client: ApiFootballClient,
    private readonly cacheService: SportsDataCacheService,
  ) {}

  async getAll(): Promise<CountryDto[]> {
    const cacheKey = 'sports:countries';
    const cached = await this.cacheService.getCached<CountryDto[]>(cacheKey);
    if (cached) return cached;

    const raw = await this.client.get<RafCountryResponse>('countries');
    const countries = raw.map((r) => {
      const dto = new CountryDto();
      dto.name = r.name;
      dto.code = r.code;
      dto.flag = r.flag;
      return dto;
    });

    await this.cacheService.setCached(cacheKey, countries, TTL_TEAMS);
    return countries;
  }

  async search(name: string): Promise<CountryDto[]> {
    const all = await this.getAll();
    const q = name.toLowerCase();
    return all.filter((c) => c.name.toLowerCase().includes(q));
  }
}
