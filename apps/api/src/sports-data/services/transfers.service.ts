import { Injectable, Logger } from '@nestjs/common';
import { ApiFootballClient } from '../client/api-football.client';
import {
  SportsDataCacheService,
  TTL_TEAMS,
} from '../sports-data-cache.service';
import { RafTransferResponse } from '../interfaces/api-football.interfaces';
import { TransferDto, TransferEntryDto } from '../dto/transfer.dto';

@Injectable()
export class TransfersService {
  private readonly logger = new Logger(TransfersService.name);

  constructor(
    private readonly client: ApiFootballClient,
    private readonly cacheService: SportsDataCacheService,
  ) {}

  async getByPlayer(playerId: string): Promise<TransferDto | null> {
    const cacheKey = `sports:transfers:player:${playerId}`;
    const cached = await this.cacheService.getCached<TransferDto>(cacheKey);
    if (cached) return cached;

    const raw = await this.client.get<RafTransferResponse>('transfers', {
      player: playerId,
    });

    if (!raw.length) return null;
    const dto = this.toDto(raw[0]);
    await this.cacheService.setCached(cacheKey, dto, TTL_TEAMS);
    return dto;
  }

  async getByTeam(teamId: string): Promise<TransferDto[]> {
    const cacheKey = `sports:transfers:team:${teamId}`;
    const cached = await this.cacheService.getCached<TransferDto[]>(cacheKey);
    if (cached) return cached;

    const raw = await this.client.get<RafTransferResponse>('transfers', {
      team: teamId,
    });

    const transfers = raw.map((r) => this.toDto(r));
    await this.cacheService.setCached(cacheKey, transfers, TTL_TEAMS);
    return transfers;
  }

  private toDto(r: RafTransferResponse): TransferDto {
    const dto = new TransferDto();
    dto.playerId = r.player.id;
    dto.playerName = r.player.name;
    dto.transfers = (r.transfers ?? []).map((t) => {
      const entry = new TransferEntryDto();
      entry.date = t.date;
      entry.type = t.type;
      entry.teamInId = t.teams.in.id;
      entry.teamInName = t.teams.in.name;
      entry.teamInLogo = t.teams.in.logo;
      entry.teamOutId = t.teams.out.id;
      entry.teamOutName = t.teams.out.name;
      entry.teamOutLogo = t.teams.out.logo;
      return entry;
    });
    return dto;
  }
}
