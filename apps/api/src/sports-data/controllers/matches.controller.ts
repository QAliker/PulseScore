import { Controller, Get, Param, NotFoundException } from '@nestjs/common';
import { FixturesService } from '../services/fixtures.service';
import { OddsService } from '../services/odds.service';
import { MatchDto } from '../dto/match.dto';
import { OddsDto } from '../dto/odds.dto';

@Controller('matches')
export class MatchesController {
  constructor(
    private readonly fixturesService: FixturesService,
    private readonly oddsService: OddsService,
  ) {}

  @Get(':id')
  async getMatch(@Param('id') id: string): Promise<MatchDto> {
    const match = await this.fixturesService.getMatchById(id);
    if (!match) throw new NotFoundException();
    return match;
  }

  @Get(':id/odds')
  async getOdds(@Param('id') id: string): Promise<OddsDto[]> {
    return this.oddsService.getOdds(id);
  }

  @Get(':id/odds/live')
  async getLiveOdds(@Param('id') id: string): Promise<OddsDto[]> {
    return this.oddsService.getLiveOdds(id);
  }
}
