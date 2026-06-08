import { Test, TestingModule } from '@nestjs/testing';
import { LivescoreService } from '../services/livescore.service';
import { LiveStreamService } from '../services/live-stream.service';
import { MatchDto } from '../dto/match.dto';

describe('LivescoreService', () => {
  let service: LivescoreService;
  let mockLiveStream: Partial<LiveStreamService>;

  beforeEach(async () => {
    mockLiveStream = {
      snapshot: jest.fn().mockResolvedValue([]),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LivescoreService,
        { provide: LiveStreamService, useValue: mockLiveStream },
      ],
    }).compile();

    service = module.get<LivescoreService>(LivescoreService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('getCurrent delegates to LiveStreamService.snapshot()', async () => {
    const mockMatches: MatchDto[] = [];
    jest
      .spyOn(mockLiveStream, 'snapshot' as any)
      .mockResolvedValue(mockMatches);
    const result = await service.getCurrent();
    expect(result).toEqual(mockMatches);
    expect(mockLiveStream.snapshot).toHaveBeenCalled();
  });
});
