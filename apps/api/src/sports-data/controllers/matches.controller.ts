import { Controller, Get, Param, NotFoundException } from '@nestjs/common';
import { FixturesService } from '../services/fixtures.service';
import { MatchDto } from '../dto/match.dto';

@Controller('matches')
export class MatchesController {
  constructor(private readonly fixturesService: FixturesService) {}

  @Get(':id')
  async getMatch(@Param('id') id: string): Promise<MatchDto> {
    const match = await this.fixturesService.getMatchById(id);
    if (!match) throw new NotFoundException();
    return match;
  }
}
