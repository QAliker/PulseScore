import { Controller, Get, Param, NotFoundException, Query } from '@nestjs/common';
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

@Controller('odds')
export class OddsMetaController {
  constructor(private readonly oddsService: OddsService) {}

  @Get('bookmakers')
  async getBookmakers() {
    return this.oddsService.getBookmakers();
  }

  @Get('bets')
  async getBets() {
    return this.oddsService.getBets();
  }

  @Get('live/bets')
  async getLiveBets() {
    return this.oddsService.getLiveBets();
  }

  @Get('mapping')
  async getMapping(
    @Query('fixture') fixtureId?: string,
    @Query('league') league?: string,
    @Query('date') date?: string,
    @Query('page') page?: string,
  ) {
    return this.oddsService.getMapping({ fixtureId, league, date, page });
  }
}
