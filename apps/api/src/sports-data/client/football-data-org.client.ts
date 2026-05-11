import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class FootballDataOrgClient {
  private readonly logger = new Logger(FootballDataOrgClient.name);
  private readonly baseUrl = 'https://api.football-data.org/v4';
  private readonly apiKey: string;

  constructor(private readonly configService: ConfigService) {
    this.apiKey = this.configService.get<string>('FOOTBALL_DATA_ORG_KEY') ?? '';
  }

  async get<T>(
    endpoint: string,
    params: Record<string, string | number> = {},
  ): Promise<T> {
    const query = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      query.set(k, String(v));
    }
    const qs = query.toString();
    const url = `${this.baseUrl}/${endpoint}${qs ? `?${qs}` : ''}`;
    this.logger.debug(`GET ${url}`);

    const response = await fetch(url, {
      headers: {
        'X-Auth-Token': this.apiKey,
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(
        `football-data.org request failed: ${response.status} ${response.statusText}`,
      );
    }

    return response.json() as Promise<T>;
  }
}
