import { Controller, Get, Param } from '@nestjs/common';
import { TrophiesService } from '../services/trophies.service';
import { TrophyDto } from '../dto/trophy.dto';

@Controller()
export class TrophiesController {
  constructor(private readonly trophiesService: TrophiesService) {}

  @Get('players/:playerId/trophies')
  async getByPlayer(@Param('playerId') playerId: string): Promise<TrophyDto[]> {
    return this.trophiesService.getByPlayer(playerId);
  }

  @Get('coaches/:coachId/trophies')
  async getByCoach(@Param('coachId') coachId: string): Promise<TrophyDto[]> {
    return this.trophiesService.getByCoach(coachId);
  }
}
