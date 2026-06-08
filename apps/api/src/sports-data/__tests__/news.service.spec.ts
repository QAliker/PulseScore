import { NewsService } from '../services/news.service';
import { GuardianClient, GuardianResult } from '../client/guardian.client';
import { SportsDataCacheService } from '../sports-data-cache.service';

function makeResult(over: Partial<GuardianResult> = {}): GuardianResult {
  return {
    id: 'football/2026/jun/08/example',
    type: 'article',
    webTitle: 'Example title',
    webUrl: 'https://www.theguardian.com/football/2026/jun/08/example',
    webPublicationDate: '2026-06-08T10:00:00Z',
    sectionId: 'football',
    sectionName: 'Football',
    fields: {
      thumbnail: 'https://media.guim.co.uk/thumb.jpg',
      trailText: '<p>Some <strong>trail</strong> text</p>',
      byline: 'A Writer',
    },
    ...over,
  };
}

describe('NewsService', () => {
  let service: NewsService;
  let client: { search: jest.Mock };
  let cache: { getCached: jest.Mock; setCached: jest.Mock };

  beforeEach(() => {
    client = { search: jest.fn() };
    cache = {
      getCached: jest.fn().mockResolvedValue(null),
      setCached: jest.fn().mockResolvedValue(undefined),
    };
    service = new NewsService(
      client as unknown as GuardianClient,
      cache as unknown as SportsDataCacheService,
    );
  });

  describe('getFeed category → tag mapping', () => {
    beforeEach(() => {
      client.search.mockResolvedValue({
        results: [],
        totalPages: 1,
        currentPage: 1,
      });
    });

    it('maps "transfers" to the transfer-window tag', async () => {
      await service.getFeed({ category: 'transfers' });
      expect(client.search).toHaveBeenCalledWith(
        expect.objectContaining({ tag: 'football/transfer-window' }),
      );
    });

    it('maps "results" to the matchreports tone tag', async () => {
      await service.getFeed({ category: 'results' });
      expect(client.search).toHaveBeenCalledWith(
        expect.objectContaining({ tag: 'tone/matchreports' }),
      );
    });

    it('maps "team-news" to football section + news tone', async () => {
      await service.getFeed({ category: 'team-news' });
      expect(client.search).toHaveBeenCalledWith(
        expect.objectContaining({ section: 'football', tag: 'tone/news' }),
      );
    });

    it('defaults unknown categories to the football section', async () => {
      await service.getFeed({ category: 'nonsense' });
      expect(client.search).toHaveBeenCalledWith(
        expect.objectContaining({ section: 'football' }),
      );
    });

    it('passes a search query through as q', async () => {
      await service.getFeed({ q: '  mbappe ' });
      expect(client.search).toHaveBeenCalledWith(
        expect.objectContaining({ q: 'mbappe' }),
      );
    });
  });

  describe('toDto mapping', () => {
    it('strips HTML from trailText and flattens fields', async () => {
      client.search.mockResolvedValue({
        results: [makeResult()],
        totalPages: 3,
        currentPage: 1,
      });
      const feed = await service.getFeed({});
      expect(feed.totalPages).toBe(3);
      expect(feed.articles[0]).toEqual({
        id: 'football/2026/jun/08/example',
        title: 'Example title',
        trailText: 'Some trail text',
        url: 'https://www.theguardian.com/football/2026/jun/08/example',
        thumbnail: 'https://media.guim.co.uk/thumb.jpg',
        byline: 'A Writer',
        published: '2026-06-08T10:00:00Z',
        section: 'Football',
      });
    });

    it('nulls missing optional fields', async () => {
      client.search.mockResolvedValue({
        results: [makeResult({ fields: undefined })],
        totalPages: 1,
        currentPage: 1,
      });
      const feed = await service.getFeed({});
      expect(feed.articles[0].trailText).toBeNull();
      expect(feed.articles[0].thumbnail).toBeNull();
      expect(feed.articles[0].byline).toBeNull();
    });
  });

  describe('resilience', () => {
    it('returns an empty feed when Guardian throws', async () => {
      client.search.mockRejectedValue(new Error('rate limited'));
      const feed = await service.getFeed({ page: 2 });
      expect(feed).toEqual({ articles: [], page: 2, totalPages: 1 });
    });

    it('serves cached feeds without hitting the client', async () => {
      cache.getCached.mockResolvedValue({
        articles: [],
        page: 1,
        totalPages: 1,
      });
      await service.getFeed({});
      expect(client.search).not.toHaveBeenCalled();
    });
  });

  describe('teamSlug', () => {
    it.each([
      ['Manchester United FC', 'manchester-united'],
      ['Arsenal FC', 'arsenal'],
      ['Brighton & Hove Albion', 'brighton-and-hove-albion'],
      ['AFC Bournemouth', 'bournemouth'],
      ['Atlético Madrid', 'atletico-madrid'],
    ])('slugifies "%s" → "%s"', (name, expected) => {
      expect(service.teamSlug(name)).toBe(expected);
    });
  });

  describe('getByTeam', () => {
    it('queries the team football tag from the slug', async () => {
      client.search.mockResolvedValue({
        results: [],
        totalPages: 1,
        currentPage: 1,
      });
      await service.getByTeam('Liverpool FC');
      expect(client.search).toHaveBeenCalledWith(
        expect.objectContaining({ tag: 'football/liverpool' }),
      );
    });
  });
});
