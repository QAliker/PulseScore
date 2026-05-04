import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

interface RapidApiEnvelope<T> {
  response: T[];
  errors: unknown;
  results: number;
}

@Injectable()
export class ApiFootballClient {
  private readonly logger = new Logger(ApiFootballClient.name);
  private readonly baseUrl = 'https://api-football-v1.p.rapidapi.com/v3';
  private readonly host = 'api-football-v1.p.rapidapi.com';
  private readonly apiKey: string;

  constructor(private readonly configService: ConfigService) {
    this.apiKey = this.configService.get<string>('RAPIDAPI_KEY') ?? '';
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
        'x-rapidapi-key': this.apiKey,
        'x-rapidapi-host': this.host,
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
}
