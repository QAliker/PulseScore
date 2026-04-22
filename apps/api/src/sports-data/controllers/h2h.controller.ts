import { Controller, Get, Param } from '@nestjs/common';
import { H2hService } from '../services/h2h.service';
import { H2hDto } from '../dto/h2h.dto';

@Controller('h2h')
export class H2hController {
  constructor(private readonly h2hService: H2hService) {}

  @Get(':teamId1/:teamId2')
  async getH2H(
    @Param('teamId1') teamId1: string,
    @Param('teamId2') teamId2: string,
  ): Promise<H2hDto> {
    return this.h2hService.getH2H(teamId1, teamId2);
  }
}
