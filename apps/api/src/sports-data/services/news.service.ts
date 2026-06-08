import { Injectable, Logger } from '@nestjs/common';
import { GuardianClient, GuardianResult } from '../client/guardian.client';
import { SportsDataCacheService } from '../sports-data-cache.service';
import { ArticleDto, NewsFeedDto } from '../dto/article.dto';

export type NewsCategory = 'all' | 'transfers' | 'results' | 'team-news';

const TTL_NEWS = 15 * 60; // 15 min — respects Guardian 500 calls/day cap
const PAGE_SIZE = 24;
const TEAM_PAGE_SIZE = 12;

/** Category → Guardian Content API query params. */
const CATEGORY_PARAMS: Record<NewsCategory, Record<string, string>> = {
  all: { section: 'football' },
  transfers: { tag: 'football/transfer-window' },
  results: { tag: 'tone/matchreports' },
  'team-news': { section: 'football', tag: 'tone/news' },
};

function stripHtml(input?: string): string | null {
  if (!input) return null;
  const clean = input.replace(/<[^>]*>/g, '').trim();
  return clean.length ? clean : null;
}

@Injectable()
export class NewsService {
  private readonly logger = new Logger(NewsService.name);

  constructor(
    private readonly client: GuardianClient,
    private readonly cacheService: SportsDataCacheService,
  ) {}

  async getFeed(opts: {
    category?: string;
    page?: number;
    q?: string;
  }): Promise<NewsFeedDto> {
    const category = this.normalizeCategory(opts.category);
    const page = Math.min(Math.max(opts.page ?? 1, 1), 50);
    const q = opts.q?.trim() || undefined;

    const cacheKey = `sports:news:${category}:${page}:${q ?? ''}`;
    const cached = await this.cacheService.getCached<NewsFeedDto>(cacheKey);
    if (cached) return cached;

    const params: Record<string, string | number> = {
      ...CATEGORY_PARAMS[category],
      page,
      'page-size': PAGE_SIZE,
    };
    if (q) params.q = q;

    try {
      const { results, totalPages, currentPage } =
        await this.client.search(params);
      const dto: NewsFeedDto = {
        articles: results.map((r) => this.toDto(r)),
        page: currentPage,
        totalPages,
      };
      await this.cacheService.setCached(cacheKey, dto, TTL_NEWS);
      return dto;
    } catch (err) {
      this.logger.warn(`Guardian feed failed (${category}): ${String(err)}`);
      return { articles: [], page, totalPages: 1 };
    }
  }

  async getByTeam(teamName: string, page = 1): Promise<NewsFeedDto> {
    const slug = this.teamSlug(teamName);
    if (!slug) return { articles: [], page: 1, totalPages: 1 };

    const safePage = Math.min(Math.max(page, 1), 50);
    const cacheKey = `sports:news:team:${slug}:${safePage}`;
    const cached = await this.cacheService.getCached<NewsFeedDto>(cacheKey);
    if (cached) return cached;

    try {
      const { results, totalPages, currentPage } = await this.client.search({
        tag: `football/${slug}`,
        page: safePage,
        'page-size': TEAM_PAGE_SIZE,
      });
      const dto: NewsFeedDto = {
        articles: results.map((r) => this.toDto(r)),
        page: currentPage,
        totalPages,
      };
      await this.cacheService.setCached(cacheKey, dto, TTL_NEWS);
      return dto;
    } catch (err) {
      this.logger.warn(
        `Guardian team feed failed ("${teamName}"): ${String(err)}`,
      );
      return { articles: [], page: safePage, totalPages: 1 };
    }
  }

  private normalizeCategory(c?: string): NewsCategory {
    if (c === 'transfers' || c === 'results' || c === 'team-news') return c;
    return 'all';
  }

  /** Derive a Guardian football tag slug from a team name, e.g. "Manchester United FC" → "manchester-united". */
  teamSlug(name: string): string {
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '') // strip accents
      .replace(/&/g, ' and ')
      .replace(/\ba\.?f\.?c\.?\b/g, '') // strip AFC
      .replace(/\bf\.?c\.?\b/g, '') // strip FC
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  private toDto(r: GuardianResult): ArticleDto {
    return {
      id: r.id,
      title: r.webTitle,
      trailText: stripHtml(r.fields?.trailText),
      url: r.webUrl,
      thumbnail: r.fields?.thumbnail ?? null,
      byline: r.fields?.byline ?? null,
      published: r.webPublicationDate,
      section: r.sectionName,
    };
  }
}
