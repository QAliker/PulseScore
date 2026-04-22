import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PlayerDto } from '../dto/player.dto';

type PrismaPlayer = {
  externalId: string;
  name: string;
  image: string | null;
  number: number | null;
  position: string | null;
  age: number | null;
  teamId: string | null;
  goals: number;
  assists: number;
  yellowCards: number;
  redCards: number;
  matchesPlayed: number;
  rating: string | null;
};

@Injectable()
export class PlayersService {
  constructor(private readonly prisma: PrismaService) {}

  async getByExternalId(
    externalId: string,
  ): Promise<(PlayerDto & { teamName: string | null; teamLogo: string | null }) | null> {
    const p = await this.prisma.player.findUnique({
      where: { externalId },
      include: { team: true },
    });
    if (!p) return null;
    return {
      ...this.toDto(p),
      teamName: p.team?.name ?? null,
      teamLogo: p.team?.logo ?? null,
    };
  }

  async getByTeam(teamExternalId: string): Promise<PlayerDto[]> {
    const team = await this.prisma.team.findUnique({
      where: { externalId: teamExternalId },
      include: {
        players: { orderBy: [{ number: 'asc' }, { name: 'asc' }] },
      },
    });
    if (!team) return [];
    return team.players.map((p) => this.toDto(p));
  }

  private toDto(p: PrismaPlayer): PlayerDto {
    const dto = new PlayerDto();
    dto.externalId = p.externalId;
    dto.name = p.name;
    dto.image = p.image;
    dto.number = p.number;
    dto.position = p.position;
    dto.age = p.age;
    dto.teamId = p.teamId;
    dto.goals = p.goals;
    dto.assists = p.assists;
    dto.yellowCards = p.yellowCards;
    dto.redCards = p.redCards;
    dto.matchesPlayed = p.matchesPlayed;
    dto.rating = p.rating;
    return dto;
  }
}
