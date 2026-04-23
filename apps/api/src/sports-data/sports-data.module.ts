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
import { PlayersService } from './services/players.service';
import { LeaguesController } from './controllers/leagues.controller';
import { TeamsController } from './controllers/teams.controller';
import { PlayersController } from './controllers/players.controller';
import { H2hController } from './controllers/h2h.controller';
import { LivescoreController } from './controllers/livescore.controller';
import { MatchesController } from './controllers/matches.controller';

@Module({
  imports: [ScheduleModule.forRoot(), PrismaModule],
  controllers: [LivescoreController, LeaguesController, TeamsController, PlayersController, H2hController, MatchesController],
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
    PlayersService,
  ],
  exports: [
    LivescoreService,
    FixturesService,
    StandingsService,
    TeamsService,
    OddsService,
    H2hService,
    PlayersService,
    SportsDataCacheService,
  ],
})
export class SportsDataModule {}
