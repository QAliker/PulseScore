import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from '../prisma/prisma.module';
import { ApiFootballClient } from './client/api-football.client';
import { ApiFootballNormalizer } from './normalizer/api-football.normalizer';
import { SportsDataCacheService } from './sports-data-cache.service';
import { LivescoreService } from './services/livescore.service';
import { FixturesService } from './services/fixtures.service';
import { StandingsService } from './services/standings.service';
import { TeamsService } from './services/teams.service';
import { OddsService } from './services/odds.service';
import { H2hService } from './services/h2h.service';

@Module({
  imports: [ScheduleModule.forRoot(), PrismaModule],
  providers: [
    ApiFootballClient,
    ApiFootballNormalizer,
    SportsDataCacheService,
    LivescoreService,
    FixturesService,
    StandingsService,
    TeamsService,
    OddsService,
    H2hService,
  ],
  exports: [
    LivescoreService,
    FixturesService,
    StandingsService,
    TeamsService,
    OddsService,
    H2hService,
    SportsDataCacheService,
  ],
})
export class SportsDataModule {}
