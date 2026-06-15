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
   * Fetch a league scoreboard.
   *
   * We use the CDN core endpoint (`cdn.espn.com/core/.../scoreboard?xhr=1`)
   * rather than `site.api.espn.com/.../scoreboard`. The site.api endpoint
   * permanently serves an unparseable schema doc (`{ day: { date: date? } ...}`)
   * for the `fifa.*` family — the only in-season competition during the summer
   * World Cup window — so the live feed was always empty. The CDN endpoint
   * returns real JSON for every slug and wraps the same `{ leagues, events }`
   * shape under `content.sbData`.
   */
  async getScoreboard(
    leagueSlug: string,
    opts: { dates?: string } = {},
    retries = 2,
  ): Promise<EspnScoreboardResponse> {
    const datesParam = opts.dates
      ? `&dates=${encodeURIComponent(opts.dates)}`
      : '';
    const url = `https://cdn.espn.com/core/soccer/scoreboard?xhr=1&league=${encodeURIComponent(leagueSlug)}${datesParam}`;
    let lastErr: unknown;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const response = await fetch(url, {
          headers: { Accept: 'application/json' },
        });
        if (!response.ok) {
          throw new Error(`ESPN ${leagueSlug}: ${response.status}`);
        }
        const data = (await response.json()) as {
          content?: { sbData?: EspnScoreboardResponse };
        };
        const sbData = data?.content?.sbData;
        if (!sbData) {
          throw new Error(`ESPN ${leagueSlug}: missing content.sbData`);
        }
        return sbData;
      } catch (err) {
        lastErr = err;
      }
    }

    throw new Error(
      `ESPN scoreboard ${leagueSlug} failed after ${retries + 1} tries: ${String(lastErr)}`,
    );
  }
}
