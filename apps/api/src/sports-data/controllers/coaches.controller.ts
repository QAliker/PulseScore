import { Controller, Get, NotFoundException, Param } from '@nestjs/common';
import { CoachesService } from '../services/coaches.service';
import { CoachDto } from '../dto/coach.dto';

@Controller()
export class CoachesController {
  constructor(private readonly coachesService: CoachesService) {}

  @Get('teams/:teamId/coach')
  async getByTeam(@Param('teamId') teamId: string): Promise<CoachDto[]> {
    return this.coachesService.getByTeam(teamId);
  }

  @Get('coaches/:coachId')
  async getById(@Param('coachId') coachId: string): Promise<CoachDto> {
    const coach = await this.coachesService.getById(coachId);
    if (!coach) throw new NotFoundException();
    return coach;
  }
}
