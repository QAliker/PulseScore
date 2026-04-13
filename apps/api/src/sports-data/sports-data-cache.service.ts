import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';

export const TTL_LIVE = 30;             // 30 seconds (WebSocket updates frequently)
export const TTL_ODDS = 5 * 60;         // 5 minutes
export const TTL_H2H = 60 * 60;         // 1 hour
export const TTL_LINEUPS = 3 * 60 * 60; // 3 hours (match duration)
export const TTL_STATISTICS = 3 * 60 * 60;
export const TTL_STANDINGS = 6 * 60 * 60; // 6 hours
export const TTL_FIXTURES = 6 * 60 * 60;
export const TTL_TEAMS = 24 * 60 * 60;  // 24 hours

@Injectable()
export class SportsDataCacheService {
  private readonly logger = new Logger(SportsDataCacheService.name);

  constructor(private readonly redisService: RedisService) {}

  async getCached<T>(key: string): Promise<T | null> {
    const client = this.redisService.getClient();
    const raw = await client.get(key);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as T;
    } catch (err) {
      this.logger.warn(`Failed to parse cached value for key "${key}": ${String(err)}`);
      return null;
    }
  }

  async setCached<T>(key: string, data: T, ttlSeconds: number): Promise<void> {
    const client = this.redisService.getClient();
    await client.set(key, JSON.stringify(data), 'EX', ttlSeconds);
  }

  async invalidate(key: string): Promise<void> {
    const client = this.redisService.getClient();
    await client.del(key);
  }

  async invalidatePattern(pattern: string): Promise<void> {
    const client = this.redisService.getClient();
    const keys = await client.keys(pattern);
    if (keys.length > 0) {
      await client.del(...keys);
      this.logger.log(`Invalidated ${keys.length} key(s) matching pattern "${pattern}"`);
    }
  }

  // ── Key generators ──────────────────────────────────────────────────────────

  static livescoresKey(): string {
    return 'sports:live';
  }

  static fixturesKey(leagueId: string, from: string, to: string): string {
    return `sports:fixtures:${leagueId}:${from}:${to}`;
  }

  static standingsKey(leagueId: string): string {
    return `sports:standings:${leagueId}`;
  }

  static teamsKey(leagueId: string): string {
    return `sports:teams:${leagueId}`;
  }

  static oddsKey(matchId: string): string {
    return `sports:odds:${matchId}`;
  }

  static h2hKey(teamId1: string, teamId2: string): string {
    const sorted = [teamId1, teamId2].sort();
    return `sports:h2h:${sorted[0]}:${sorted[1]}`;
  }

  static lineupsKey(matchId: string): string {
    return `sports:lineups:${matchId}`;
  }

  static statisticsKey(matchId: string): string {
    return `sports:statistics:${matchId}`;
  }
}
