import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { SofascoreLiveResponse } from '../interfaces/sofascore.interfaces';

@Injectable()
export class SofascoreClient {
  private readonly logger = new Logger(SofascoreClient.name);
  private readonly liveUrl =
    'https://api.sofascore.com/api/v1/sport/football/events/live';

  async getLive(): Promise<SofascoreLiveResponse> {
    const response = await fetch(this.liveUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
          '(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        Referer: 'https://www.sofascore.com/',
        Accept: 'application/json',
      },
    });

    if (response.status === 429 || response.status === 503) {
      this.logger.warn(`Sofascore throttled: ${response.status}`);
      throw new HttpException(
        `Sofascore unavailable (${response.status})`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    if (!response.ok) {
      throw new Error(
        `Sofascore request failed: ${response.status} ${response.statusText}`,
      );
    }

    return response.json() as Promise<SofascoreLiveResponse>;
  }
}
