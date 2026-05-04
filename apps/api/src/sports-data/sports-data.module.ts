import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from '../prisma/prisma.module';
import { ApiFootballClient } from './client/api-football.client';
import { ApiFootballNormalizer } from './normalizer/api-football.normalizer';
import { SportsDataCacheService } from './sports-data-cache.service';

// Services
import { LivescoreService } from './services/livescore.service';
import { FixturesService } from './services/fixtures.service';
import { StandingsService } from './services/standings.service';
import { TeamsService } from './services/teams.service';
import { OddsService } from './services/odds.service';
import { H2hService } from './services/h2h.service';
import { PlayersService } from './services/players.service';
import { InjuriesService } from './services/injuries.service';
import { PredictionsService } from './services/predictions.service';
import { CoachesService } from './services/coaches.service';
import { TransfersService } from './services/transfers.service';
import { TrophiesService } from './services/trophies.service';
import { SidelinedService } from './services/sidelined.service';
import { CountriesService } from './services/countries.service';
import { VenuesService } from './services/venues.service';

// Controllers
import { LeaguesController } from './controllers/leagues.controller';
import { TeamsController } from './controllers/teams.controller';
import { PlayersController } from './controllers/players.controller';
import { H2hController } from './controllers/h2h.controller';
import { LivescoreController } from './controllers/livescore.controller';
import { MatchesController } from './controllers/matches.controller';
import { InjuriesController } from './controllers/injuries.controller';
import { PredictionsController } from './controllers/predictions.controller';
import { CoachesController } from './controllers/coaches.controller';
import { TransfersController } from './controllers/transfers.controller';
import { TrophiesController } from './controllers/trophies.controller';
import { SidelinedController } from './controllers/sidelined.controller';
import { CountriesController } from './controllers/countries.controller';
import {
  VenuesController,
  TeamVenuesController,
} from './controllers/venues.controller';

@Module({
  imports: [ScheduleModule.forRoot(), PrismaModule],
  controllers: [
    LivescoreController,
    LeaguesController,
    TeamsController,
    PlayersController,
    H2hController,
    MatchesController,
    InjuriesController,
    PredictionsController,
    CoachesController,
    TransfersController,
    TrophiesController,
    SidelinedController,
    CountriesController,
    VenuesController,
    TeamVenuesController,
  ],
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
    InjuriesService,
    PredictionsService,
    CoachesService,
    TransfersService,
    TrophiesService,
    SidelinedService,
    CountriesService,
    VenuesService,
  ],
  exports: [
    LivescoreService,
    FixturesService,
    StandingsService,
    TeamsService,
    OddsService,
    H2hService,
    PlayersService,
    InjuriesService,
    PredictionsService,
    CoachesService,
    TransfersService,
    TrophiesService,
    SidelinedService,
    CountriesService,
    VenuesService,
    SportsDataCacheService,
  ],
})
export class SportsDataModule {}
