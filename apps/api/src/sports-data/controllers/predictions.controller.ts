import { Controller, Get, NotFoundException, Param } from '@nestjs/common';
import { PredictionsService } from '../services/predictions.service';
import { PredictionDto } from '../dto/prediction.dto';

@Controller('fixtures')
export class PredictionsController {
  constructor(private readonly predictionsService: PredictionsService) {}

  @Get(':fixtureId/predictions')
  async getPrediction(
    @Param('fixtureId') fixtureId: string,
  ): Promise<PredictionDto> {
    const prediction = await this.predictionsService.getByFixture(fixtureId);
    if (!prediction) throw new NotFoundException();
    return prediction;
  }
}
