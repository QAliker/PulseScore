import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class ApiFootballClient {
  private readonly logger = new Logger(ApiFootballClient.name);
  private readonly baseUrl = 'https://apiv3.apifootball.com/';
  private readonly apiKey: string;
  private readonly timezone: string;
  private lastRequestAt = 0;
  private readonly minIntervalMs = 20_000; // 180 req/h ≈ 1 req per 20s

  constructor(private readonly configService: ConfigService) {
    this.apiKey = this.configService.get<string>('APIFOOTBALL_API_KEY') ?? '';
    this.timezone = this.configService.get<string>('APIFOOTBALL_TIMEZONE') ?? 'Europe/Paris';
  }

  private async throttle(): Promise<void> {
    const now = Date.now();
    const elapsed = now - this.lastRequestAt;
    if (elapsed < this.minIntervalMs) {
      const wait = this.minIntervalMs - elapsed;
      await new Promise<void>((resolve) => setTimeout(resolve, wait));
    }
    this.lastRequestAt = Date.now();
  }

  async get<T = unknown>(action: string, params: Record<string, string>): Promise<T> {
    await this.throttle();

    const query = new URLSearchParams({
      action,
      APIkey: this.apiKey,
      timezone: this.timezone,
      ...params,
    });

    const url = `${this.baseUrl}?${query.toString()}`;
    this.logger.debug(`GET ${url}`);

    const response = await fetch(url, {
      headers: { Accept: 'application/json' },
    });

    if (!response.ok) {
      throw new Error(`APIFootball request failed: ${response.status} ${response.statusText}`);
    }

    return response.json() as Promise<T>;
  }
}
