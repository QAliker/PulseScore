import {
  Controller,
  Get,
  NotFoundException,
  Param,
  Query,
} from '@nestjs/common';
import { VenuesService } from '../services/venues.service';
import { VenueDto } from '../dto/venue.dto';

@Controller('venues')
export class VenuesController {
  constructor(private readonly venuesService: VenuesService) {}

  @Get(':venueId')
  async getById(@Param('venueId') venueId: string): Promise<VenueDto> {
    const venue = await this.venuesService.getById(venueId);
    if (!venue) throw new NotFoundException();
    return venue;
  }
}

@Controller()
export class TeamVenuesController {
  constructor(private readonly venuesService: VenuesService) {}

  @Get('teams/:teamId/venues')
  async getByTeam(@Param('teamId') teamId: string): Promise<VenueDto[]> {
    return this.venuesService.getByTeam(teamId);
  }

  @Get('leagues/:leagueId/venues')
  async getByLeague(
    @Param('leagueId') leagueId: string,
    @Query('season') season = '2025',
  ): Promise<VenueDto[]> {
    return this.venuesService.getByLeague(leagueId, parseInt(season, 10));
  }
}
