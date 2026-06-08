import { Injectable, Logger } from '@nestjs/common';
import { EspnScoreboardResponse } from '../interfaces/espn-scoreboard.interfaces';

@Injectable()
export class EspnClient {
  private readonly logger = new Logger(EspnClient.name);
  private readonly baseUrl =
    'https://site.api.espn.com/apis/site/v2/sports/soccer';

  async get<T>(path: string, params: Record<string, string> = {}): Promise<T> {
    const query = new URLSearchParams(params);
    const url = `${this.baseUrl}/${path}${query.toString() ? `?${query.toString()}` : ''}`;
    this.logger.debug(`GET ${url}`);

    const response = await fetch(url, {
      headers: { Accept: 'application/json' },
    });

    if (!response.ok) {
      throw new Error(
        `ESPN request failed: ${response.status} ${response.statusText}`,
      );
    }

    return response.json() as Promise<T>;
  }

  /**
   * Fetch a league scoreboard. ESPN intermittently returns a non-JSON schema
   * doc instead of data, so parse defensively and retry a couple of times.
   */
  async getScoreboard(
    leagueSlug: string,
    retries = 2,
  ): Promise<EspnScoreboardResponse> {
    const url = `${this.baseUrl}/${leagueSlug}/scoreboard`;
    let lastErr: unknown;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const response = await fetch(url, {
          headers: { Accept: 'application/json' },
        });
        if (!response.ok) {
          throw new Error(`ESPN ${leagueSlug}: ${response.status}`);
        }
        const text = await response.text();
        return JSON.parse(text) as EspnScoreboardResponse;
      } catch (err) {
        lastErr = err;
      }
    }

    throw new Error(
      `ESPN scoreboard ${leagueSlug} failed after ${retries + 1} tries: ${String(lastErr)}`,
    );
  }
}
