import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface GuardianResult {
  id: string;
  type: string;
  webTitle: string;
  webUrl: string;
  webPublicationDate: string;
  sectionId: string;
  sectionName: string;
  fields?: {
    thumbnail?: string;
    trailText?: string;
    byline?: string;
  };
}

interface GuardianSearchEnvelope {
  response?: {
    status: string;
    total: number;
    pages: number;
    currentPage: number;
    results: GuardianResult[];
  };
}

export interface GuardianSearchResult {
  results: GuardianResult[];
  totalPages: number;
  currentPage: number;
}

/**
 * Guardian Open Platform — Content API.
 * Docs: https://open-platform.theguardian.com/documentation/
 * Free tier: 500 calls/day, 1 call/sec — responses are Redis-cached upstream.
 */
@Injectable()
export class GuardianClient {
  private readonly logger = new Logger(GuardianClient.name);
  private readonly baseUrl = 'https://content.guardianapis.com';
  private readonly apiKey: string;

  constructor(private readonly configService: ConfigService) {
    this.apiKey = this.configService.get<string>('THE_GUARDIAN_KEY') ?? '';
  }

  async search(
    params: Record<string, string | number> = {},
  ): Promise<GuardianSearchResult> {
    const query = new URLSearchParams();
    query.set('api-key', this.apiKey);
    query.set('show-fields', 'thumbnail,trailText,byline');
    query.set('order-by', 'newest');
    for (const [k, v] of Object.entries(params)) {
      query.set(k, String(v));
    }

    const url = `${this.baseUrl}/search?${query.toString()}`;
    this.logger.debug(`GET ${url.replace(this.apiKey, '***')}`);

    const response = await fetch(url, {
      headers: { Accept: 'application/json' },
    });

    if (!response.ok) {
      throw new Error(
        `Guardian request failed: ${response.status} ${response.statusText}`,
      );
    }

    const data = (await response.json()) as GuardianSearchEnvelope;
    return {
      results: data.response?.results ?? [],
      totalPages: data.response?.pages ?? 1,
      currentPage: data.response?.currentPage ?? 1,
    };
  }
}
