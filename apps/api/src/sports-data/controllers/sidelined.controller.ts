import { Controller, Get, Param } from '@nestjs/common';
import { SidelinedService } from '../services/sidelined.service';
import { SidelinedDto } from '../dto/sidelined.dto';

@Controller()
export class SidelinedController {
  constructor(private readonly sidelinedService: SidelinedService) {}

  @Get('players/:playerId/sidelined')
  async getByPlayer(
    @Param('playerId') playerId: string,
  ): Promise<SidelinedDto[]> {
    return this.sidelinedService.getByPlayer(playerId);
  }

  @Get('coaches/:coachId/sidelined')
  async getByCoach(
    @Param('coachId') coachId: string,
  ): Promise<SidelinedDto[]> {
    return this.sidelinedService.getByCoach(coachId);
  }
}
