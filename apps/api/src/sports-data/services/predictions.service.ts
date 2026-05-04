import { Injectable, Logger } from '@nestjs/common';
import { ApiFootballClient } from '../client/api-football.client';
import {
  SportsDataCacheService,
  TTL_FIXTURES,
} from '../sports-data-cache.service';
import { RafPredictionResponse } from '../interfaces/api-football.interfaces';
import { PredictionDto } from '../dto/prediction.dto';

@Injectable()
export class PredictionsService {
  private readonly logger = new Logger(PredictionsService.name);

  constructor(
    private readonly client: ApiFootballClient,
    private readonly cacheService: SportsDataCacheService,
  ) {}

  async getByFixture(fixtureId: string): Promise<PredictionDto | null> {
    const cacheKey = `sports:predictions:${fixtureId}`;
    const cached = await this.cacheService.getCached<PredictionDto>(cacheKey);
    if (cached) return cached;

    const raw = await this.client.get<RafPredictionResponse>('predictions', {
      fixture: fixtureId,
    });

    if (!raw.length) return null;

    const r = raw[0];
    const dto = new PredictionDto();
    dto.winnerId = r.predictions.winner.id;
    dto.winnerName = r.predictions.winner.name;
    dto.winnerComment = r.predictions.winner.comment;
    dto.advice = r.predictions.advice;
    dto.percentHome = r.predictions.percent.home;
    dto.percentDraw = r.predictions.percent.draw;
    dto.percentAway = r.predictions.percent.away;
    dto.underOver = r.predictions.under_over;
    dto.goalHome = r.predictions.goals.home;
    dto.goalAway = r.predictions.goals.away;

    await this.cacheService.setCached(cacheKey, dto, TTL_FIXTURES);
    return dto;
  }
}
