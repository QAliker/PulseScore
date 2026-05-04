import { Controller, Get, NotFoundException, Param } from '@nestjs/common';
import { TransfersService } from '../services/transfers.service';
import { TransferDto } from '../dto/transfer.dto';

@Controller()
export class TransfersController {
  constructor(private readonly transfersService: TransfersService) {}

  @Get('players/:playerId/transfers')
  async getByPlayer(
    @Param('playerId') playerId: string,
  ): Promise<TransferDto> {
    const result = await this.transfersService.getByPlayer(playerId);
    if (!result) throw new NotFoundException();
    return result;
  }

  @Get('teams/:teamId/transfers')
  async getByTeam(@Param('teamId') teamId: string): Promise<TransferDto[]> {
    return this.transfersService.getByTeam(teamId);
  }
}
