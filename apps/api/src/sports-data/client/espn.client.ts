import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class EspnClient {
  private readonly logger = new Logger(EspnClient.name);
  private readonly baseUrl =
    'https://site.api.espn.com/apis/site/v2/sports/soccer';

  async get<T>(
    path: string,
    params: Record<string, string> = {},
  ): Promise<T> {
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
}
