import { Controller, Get } from '@nestjs/common';
import {
  HealthCheck,
  HealthCheckService,
  HealthIndicatorResult,
  HealthIndicatorService,
} from '@nestjs/terminus';
import { Injectable } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';

// ponytail: liveness probe checks app + Redis only, NOT the DB. Fly pings this
// every 15s; a `SELECT 1` here kept Neon awake 24/7 and burned the free compute
// quota in days. A quota'd DB isn't fixed by restarting the machine anyway.
// Use the Neon/Supabase console (or add a separate unpolled /health/db) for DB status.
@Injectable()
export class RedisHealthIndicator {
  constructor(
    private readonly redisService: RedisService,
    private readonly healthIndicatorService: HealthIndicatorService,
  ) {}

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    const indicator = this.healthIndicatorService.check(key);
    try {
      const pong = await this.redisService.ping();
      const isHealthy = pong === 'PONG';
      return isHealthy ? indicator.up() : indicator.down();
    } catch (error) {
      return indicator.down({
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
}

@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly redisIndicator: RedisHealthIndicator,
  ) {}

  @Get()
  @HealthCheck()
  check() {
    return this.health.check([() => this.redisIndicator.isHealthy('redis')]);
  }
}
