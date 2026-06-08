import { Controller, Get, Param, Query } from '@nestjs/common';
import { NewsService } from '../services/news.service';
import { TeamsService } from '../services/teams.service';
import { NewsFeedDto } from '../dto/article.dto';

@Controller()
export class NewsController {
  constructor(
    private readonly newsService: NewsService,
    private readonly teamsService: TeamsService,
  ) {}

  @Get('news')
  async getFeed(
    @Query('category') category?: string,
    @Query('page') page?: string,
    @Query('q') q?: string,
  ): Promise<NewsFeedDto> {
    return this.newsService.getFeed({
      category,
      page: page ? parseInt(page, 10) : 1,
      q,
    });
  }

  @Get('teams/:teamId/news')
  async getByTeam(
    @Param('teamId') teamId: string,
    @Query('page') page?: string,
  ): Promise<NewsFeedDto> {
    const team = await this.teamsService.getTeamByExternalId(teamId);
    if (!team) return { articles: [], page: 1, totalPages: 1 };
    return this.newsService.getByTeam(team.name, page ? parseInt(page, 10) : 1);
  }
}
