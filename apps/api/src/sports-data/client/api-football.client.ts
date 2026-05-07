import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

interface RapidApiEnvelope<T> {
  response: T[];
  errors: unknown;
  results: number;
  paging?: { current: number; total: number };
}

@Injectable()
export class ApiFootballClient {
  private readonly logger = new Logger(ApiFootballClient.name);
  private readonly baseUrl = 'https://v3.football.api-sports.io';
  private readonly apiKey: string;

  constructor(private readonly configService: ConfigService) {
    this.apiKey = this.configService.get<string>('API_FOOTBALL_KEY') ?? '';
  }

  async get<T>(
    endpoint: string,
    params: Record<string, string | number> = {},
  ): Promise<T[]> {
    const query = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      query.set(k, String(v));
    }

    const url = `${this.baseUrl}/${endpoint}${query.toString() ? `?${query.toString()}` : ''}`;
    this.logger.debug(`GET ${url}`);

    const response = await fetch(url, {
      headers: {
        'x-apisports-key': this.apiKey,
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(
        `API-Football request failed: ${response.status} ${response.statusText}`,
      );
    }

    const data = (await response.json()) as RapidApiEnvelope<T>;

    if (
      data.errors &&
      !Array.isArray(data.errors) &&
      Object.keys(data.errors as object).length > 0
    ) {
      const msg = JSON.stringify(data.errors);
      this.logger.error(`API-Football error response: ${msg}`);
      throw new Error(`API-Football error: ${msg}`);
    }

    return data.response ?? [];
  }

  async getSingle<T>(
    endpoint: string,
    params: Record<string, string | number> = {},
  ): Promise<T | null> {
    const query = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      query.set(k, String(v));
    }

    const url = `${this.baseUrl}/${endpoint}${query.toString() ? `?${query.toString()}` : ''}`;
    this.logger.debug(`GET ${url}`);

    const response = await fetch(url, {
      headers: {
        'x-apisports-key': this.apiKey,
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(
        `API-Football request failed: ${response.status} ${response.statusText}`,
      );
    }

    const data = (await response.json()) as {
      response: T;
      errors: unknown;
    };

    if (
      data.errors &&
      !Array.isArray(data.errors) &&
      Object.keys(data.errors as object).length > 0
    ) {
      const msg = JSON.stringify(data.errors);
      this.logger.error(`API-Football error response: ${msg}`);
      throw new Error(`API-Football error: ${msg}`);
    }

    return data.response ?? null;
  }

  async getPage<T>(
    endpoint: string,
    params: Record<string, string | number> = {},
  ): Promise<{ data: T[]; totalPages: number }> {
    const query = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      query.set(k, String(v));
    }

    const url = `${this.baseUrl}/${endpoint}${query.toString() ? `?${query.toString()}` : ''}`;
    this.logger.debug(`GET ${url}`);

    const response = await fetch(url, {
      headers: {
        'x-apisports-key': this.apiKey,
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(
        `API-Football request failed: ${response.status} ${response.statusText}`,
      );
    }

    const data = (await response.json()) as RapidApiEnvelope<T>;

    if (
      data.errors &&
      !Array.isArray(data.errors) &&
      Object.keys(data.errors as object).length > 0
    ) {
      const msg = JSON.stringify(data.errors);
      this.logger.error(`API-Football error response: ${msg}`);
      throw new Error(`API-Football error: ${msg}`);
    }

    return {
      data: data.response ?? [],
      totalPages: data.paging?.total ?? 1,
    };
  }
}
