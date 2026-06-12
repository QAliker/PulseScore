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

  // api-sports enforces a per-minute quota. Cold page loads fan out to many
  // endpoints at once and trip it, surfacing as "too many requests, wait a
  // minute". We space requests slightly and retry on 429 inside the window.
  private static readonly MIN_SPACING_MS = 110;
  private static readonly MAX_RETRIES = 3;
  private static readonly MAX_BACKOFF_MS = 8_000;
  private chain: Promise<unknown> = Promise.resolve();

  constructor(private readonly configService: ConfigService) {
    this.apiKey = this.configService.get<string>('API_FOOTBALL_KEY') ?? '';
  }

  /** Serialize requests with a small gap so bursts stay under the quota. */
  private schedule<T>(task: () => Promise<T>): Promise<T> {
    const run = this.chain.then(async () => {
      try {
        return await task();
      } finally {
        await new Promise((r) =>
          setTimeout(r, ApiFootballClient.MIN_SPACING_MS),
        );
      }
    });
    this.chain = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
  }

  /** Fetch with retry/backoff on 429, honoring Retry-After when present. */
  private async fetchJson(url: string): Promise<Response> {
    return this.schedule(async () => {
      for (let attempt = 0; ; attempt++) {
        const response = await fetch(url, {
          headers: {
            'x-apisports-key': this.apiKey,
            Accept: 'application/json',
          },
        });
        if (
          response.status !== 429 ||
          attempt >= ApiFootballClient.MAX_RETRIES
        ) {
          return response;
        }
        const retryAfter = Number(response.headers.get('Retry-After'));
        const waitMs = Math.min(
          Number.isFinite(retryAfter) && retryAfter > 0
            ? retryAfter * 1000
            : 500 * 2 ** attempt,
          ApiFootballClient.MAX_BACKOFF_MS,
        );
        this.logger.warn(
          `API-Football 429, retry ${attempt + 1}/${ApiFootballClient.MAX_RETRIES} in ${waitMs}ms`,
        );
        await new Promise((r) => setTimeout(r, waitMs));
      }
    });
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

    const response = await this.fetchJson(url);

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

    const response = await this.fetchJson(url);

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

    const response = await this.fetchJson(url);

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
