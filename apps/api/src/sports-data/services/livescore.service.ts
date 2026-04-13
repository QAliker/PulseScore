import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ApiFootballClient } from '../client/api-football.client';
import { ApiFootballNormalizer } from '../normalizer/api-football.normalizer';
import { SportsDataCacheService, TTL_LIVE } from '../sports-data-cache.service';
import { PrismaService } from '../../prisma/prisma.service';
import { MatchDto } from '../dto/match.dto';
import { AfMatch } from '../interfaces/api-football.interfaces';

export interface ScoreChangeEvent {
  matchId: string;
  homeTeam: string;
  awayTeam: string;
  previousScore: { home: number | null; away: number | null };
  newScore: { home: number | null; away: number | null };
  statusChanged: boolean;
  changedAt: Date;
}

@Injectable()
export class LivescoreService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(LivescoreService.name);
  private previousMatches: MatchDto[] = [];

  constructor(
    private readonly client: ApiFootballClient,
    private readonly normalizer: ApiFootballNormalizer,
    private readonly cacheService: SportsDataCacheService,
    private readonly prismaService: PrismaService,
  ) {}

  onModuleInit(): void {
    this.logger.log('LivescoreService initialized — connecting WebSocket');
    this.client.onLivescoreMessage((data) => this.handleLivescoreData(data));
    this.client.connectWebSocket();
  }

  onModuleDestroy(): void {
    this.client.disconnectWebSocket();
  }

  private async handleLivescoreData(rawMatches: AfMatch[]): Promise<void> {
    try {
      const freshMatches = rawMatches.map((m) => this.normalizer.normalizeMatch(m));

      await this.cacheService.setCached(
        SportsDataCacheService.livescoresKey(),
        freshMatches,
        TTL_LIVE,
      );

      const changes = this.detectChanges(freshMatches, this.previousMatches);

      if (changes.length > 0) {
        this.logger.log(`Detected ${changes.length} change(s)`);
        for (const change of changes) {
          this.logger.log(
            `${change.homeTeam} vs ${change.awayTeam}: ` +
            `${change.previousScore.home ?? '?'}-${change.previousScore.away ?? '?'} → ` +
            `${change.newScore.home ?? '?'}-${change.newScore.away ?? '?'}` +
            (change.statusChanged ? ` [status changed]` : ''),
          );
        }

        const changedMatches = freshMatches.filter((m) =>
          changes.some((c) => c.matchId === m.externalId),
        );
        await this.upsertMatches(changedMatches);

        for (const match of changedMatches) {
          await this.upsertMatchEvents(match);
        }
      }

      this.previousMatches = freshMatches;
    } catch (err) {
      this.logger.error('Error handling livescore data', String(err));
    }
  }

  detectChanges(current: MatchDto[], previous: MatchDto[]): ScoreChangeEvent[] {
    const previousMap = new Map(previous.map((m) => [m.externalId, m]));
    const changes: ScoreChangeEvent[] = [];

    for (const match of current) {
      const prev = previousMap.get(match.externalId);
      if (!prev) continue;

      const scoreChanged = match.homeScore !== prev.homeScore || match.awayScore !== prev.awayScore;
      const statusChanged = match.status !== prev.status;

      if (scoreChanged || statusChanged) {
        changes.push({
          matchId: match.externalId,
          homeTeam: match.homeTeam.name,
          awayTeam: match.awayTeam.name,
          previousScore: { home: prev.homeScore, away: prev.awayScore },
          newScore: { home: match.homeScore, away: match.awayScore },
          statusChanged,
          changedAt: new Date(),
        });
      }
    }

    return changes;
  }

  private async upsertMatches(matches: MatchDto[]): Promise<void> {
    for (const match of matches) {
      try {
        await this.prismaService.match.upsert({
          where: { externalId: match.externalId },
          create: {
            externalId: match.externalId,
            homeTeam: match.homeTeam.name,
            awayTeam: match.awayTeam.name,
            homeScore: match.homeScore ?? 0,
            awayScore: match.awayScore ?? 0,
            status: match.status,
            sport: match.sport,
            league: match.league?.name ?? null,
            startTime: match.startTime,
          },
          update: {
            homeScore: match.homeScore ?? 0,
            awayScore: match.awayScore ?? 0,
            status: match.status,
          },
        });
      } catch (err) {
        this.logger.error(`Failed to upsert match ${match.externalId}: ${String(err)}`);
      }
    }
  }

  private async upsertMatchEvents(match: MatchDto): Promise<void> {
    try {
      await this.prismaService.matchEvent.deleteMany({
        where: { match: { externalId: match.externalId } },
      });

      const dbMatch = await this.prismaService.match.findUnique({
        where: { externalId: match.externalId },
      });
      if (!dbMatch) return;

      const events = [];

      for (const g of match.goalscorers) {
        const isHome = !!g.homeScorer;
        events.push({
          matchId: dbMatch.id,
          type: g.info?.toLowerCase().includes('own goal') ? 'OWN_GOAL' as const
            : g.info?.toLowerCase().includes('penalty') ? 'PENALTY_GOAL' as const
            : 'GOAL' as const,
          minute: parseInt(g.time, 10) || null,
          player: isHome ? g.homeScorer : g.awayScorer,
          team: isHome ? match.homeTeam.name : match.awayTeam.name,
          detail: g.score,
        });
      }

      for (const c of match.cards) {
        const isHome = !!c.homeFault;
        events.push({
          matchId: dbMatch.id,
          type: c.card.toLowerCase().includes('red') ? 'RED_CARD' as const : 'YELLOW_CARD' as const,
          minute: parseInt(c.time, 10) || null,
          player: isHome ? c.homeFault : c.awayFault,
          team: isHome ? match.homeTeam.name : match.awayTeam.name,
          detail: c.card,
        });
      }

      if (events.length > 0) {
        await this.prismaService.matchEvent.createMany({ data: events });
      }
    } catch (err) {
      this.logger.error(`Failed to upsert events for match ${match.externalId}: ${String(err)}`);
    }
  }
}
