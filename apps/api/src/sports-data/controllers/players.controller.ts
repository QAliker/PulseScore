import { Controller, Get, NotFoundException, Param, Query } from '@nestjs/common';
import { PlayersService } from '../services/players.service';
import { PlayerDto } from '../dto/player.dto';

@Controller('players')
export class PlayersController {
  constructor(private readonly playersService: PlayersService) {}

  @Get('topscorers')
  async getTopscorers(
    @Query('league') league: string,
    @Query('season') season: string,
  ): Promise<PlayerDto[]> {
    return this.playersService.getTopscorers(league, season);
  }

  @Get('profiles')
  async getProfiles(
    @Query('league') league?: string,
    @Query('season') season?: string,
    @Query('page') page?: string,
  ): Promise<{ data: PlayerDto[]; totalPages: number }> {
    return this.playersService.getProfiles({ league, season, page });
  }

  @Get(':playerId')
  async getPlayer(@Param('playerId') playerId: string) {
    const player = await this.playersService.getByExternalId(playerId);
    if (!player) throw new NotFoundException(`Player ${playerId} not found`);
    return player;
  }
}
