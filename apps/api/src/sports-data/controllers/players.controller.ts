import { Controller, Get, NotFoundException, Param } from '@nestjs/common';
import { PlayersService } from '../services/players.service';

@Controller('players')
export class PlayersController {
  constructor(private readonly playersService: PlayersService) {}

  @Get(':playerId')
  async getPlayer(@Param('playerId') playerId: string) {
    const player = await this.playersService.getByExternalId(playerId);
    if (!player) throw new NotFoundException(`Player ${playerId} not found`);
    return player;
  }
}
