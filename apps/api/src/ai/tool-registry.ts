import { Injectable } from '@nestjs/common';
import type { ChatCompletionTool } from 'openai/resources/chat/completions';
import { LivescoreService } from '../sports-data/services/livescore.service';
import { TeamsService } from '../sports-data/services/teams.service';
import { NewsService } from '../sports-data/services/news.service';
import { FixturesService } from '../sports-data/services/fixtures.service';
import { LEAGUE_MAP } from '../sports-data/constants/season.constants';

type Handler = (args: Record<string, unknown>) => Promise<unknown>;

@Injectable()
export class ToolRegistry {
  constructor(
    private readonly live: LivescoreService,
    private readonly teams: TeamsService,
    private readonly news: NewsService,
    private readonly fixtures: FixturesService,
  ) {}

  private readonly handlers: Record<string, Handler> = {
    getLiveMatches: () => this.live.getCurrent(),
    searchTeams: (a) =>
      this.teams.searchTeams(typeof a.query === 'string' ? a.query : ''),
    getTeamNews: (a) =>
      this.news.getByTeam(typeof a.team === 'string' ? a.team : ''),
    getUpcomingFixtures: () => this.upcomingFixtures(),
  };

  /**
   * Upcoming scheduled matches across every configured league, trimmed to the
   * fields the model needs. Per-league so one league erroring can't sink the
   * rest; sorted by kickoff, capped to keep the LLM payload small.
   * ponytail: fans out to all leagues on a cache miss (≤6 provider calls);
   * these are the same cached calls the frontend makes, so usually warm.
   */
  private async upcomingFixtures() {
    const perLeague = await Promise.allSettled(
      Object.entries(LEAGUE_MAP).map(async ([leagueId, meta]) => {
        const matches = await this.fixtures.getLeagueFixtures(leagueId);
        return matches.map((m) => ({ league: meta.name, match: m }));
      }),
    );
    return perLeague
      .filter((r) => r.status === 'fulfilled')
      .flatMap((r) => r.value)
      .sort(
        (a, b) =>
          new Date(a.match.startTime).getTime() -
          new Date(b.match.startTime).getTime(),
      )
      .slice(0, 20)
      .map(({ league, match }) => ({
        league,
        home: match.homeTeam?.name,
        away: match.awayTeam?.name,
        kickoff: match.startTime,
        status: match.status,
      }));
  }

  readonly tools: ChatCompletionTool[] = [
    {
      type: 'function',
      function: {
        name: 'getLiveMatches',
        description:
          'Get all football matches currently live (in progress) right now.',
        parameters: { type: 'object', properties: {} },
      },
    },
    {
      type: 'function',
      function: {
        name: 'searchTeams',
        description:
          'Search football teams by name. Returns matching teams with their ids.',
        parameters: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'Team name to search for' },
          },
          required: ['query'],
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'getTeamNews',
        description:
          'Get recent news articles about a football team by its name.',
        parameters: {
          type: 'object',
          properties: { team: { type: 'string', description: 'Team name' } },
          required: ['team'],
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'getUpcomingFixtures',
        description:
          'Get upcoming scheduled football matches (with kickoff times) across ' +
          'the covered leagues. Use for "what matches are on today", "next ' +
          'fixtures", or upcoming-schedule questions.',
        parameters: { type: 'object', properties: {} },
      },
    },
  ];

  async execute(name: string, args: Record<string, unknown>): Promise<unknown> {
    const handler = this.handlers[name];
    if (!handler) return { error: `unknown tool: ${name}` };
    try {
      return await handler(args);
    } catch (err) {
      return { error: err instanceof Error ? err.message : String(err) };
    }
  }
}
