import { Controller, Get, Param, Query } from '@nestjs/common';
import { InjuriesService } from '../services/injuries.service';
import { InjuryDto } from '../dto/injury.dto';

@Controller()
export class InjuriesController {
  constructor(private readonly injuriesService: InjuriesService) {}

  @Get('fixtures/:fixtureId/injuries')
  async getByFixture(
    @Param('fixtureId') fixtureId: string,
  ): Promise<InjuryDto[]> {
    return this.injuriesService.getByFixture(fixtureId);
  }

  @Get('teams/:teamId/injuries')
  async getByTeam(
    @Param('teamId') teamId: string,
    @Query('season') season = '2025',
  ): Promise<InjuryDto[]> {
    return this.injuriesService.getByTeam(teamId, parseInt(season, 10));
  }
}
