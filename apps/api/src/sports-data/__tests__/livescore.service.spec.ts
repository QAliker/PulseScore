import { Test, TestingModule } from '@nestjs/testing';
import { LivescoreService } from '../services/livescore.service';
import { FootballDataOrgClient } from '../client/football-data-org.client';
import { FootballDataOrgNormalizer } from '../normalizer/football-data-org.normalizer';
import { SportsDataCacheService } from '../sports-data-cache.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('LivescoreService', () => {
  let service: LivescoreService;
  let mockFdoClient: Partial<FootballDataOrgClient>;
  let mockNormalizer: Partial<FootballDataOrgNormalizer>;
  let mockCacheService: Partial<SportsDataCacheService>;
  let mockPrisma: Partial<PrismaService>;

  beforeEach(async () => {
    mockFdoClient = {
      get: jest.fn().mockResolvedValue({ matches: [] }),
    };
    mockNormalizer = {};
    mockCacheService = {
      getCached: jest.fn().mockResolvedValue(null),
      setCached: jest.fn().mockResolvedValue(undefined),
    };
    mockPrisma = {};

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LivescoreService,
        { provide: FootballDataOrgClient, useValue: mockFdoClient },
        { provide: FootballDataOrgNormalizer, useValue: mockNormalizer },
        { provide: SportsDataCacheService, useValue: mockCacheService },
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<LivescoreService>(LivescoreService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('getCurrent should fetch from cache first', async () => {
    const mockMatches: any[] = [];
    jest
      .spyOn(mockCacheService, 'getCached' as any)
      .mockResolvedValue(mockMatches);
    const result = await service.getCurrent();
    expect(result).toEqual(mockMatches);
    expect(mockCacheService.getCached).toHaveBeenCalled();
  });
});
