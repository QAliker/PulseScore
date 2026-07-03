import { Injectable } from '@nestjs/common';
import type { ChatCompletionTool } from 'openai/resources/chat/completions';
import { LivescoreService } from '../sports-data/services/livescore.service';
import { TeamsService } from '../sports-data/services/teams.service';
import { NewsService } from '../sports-data/services/news.service';

type Handler = (args: Record<string, unknown>) => Promise<unknown>;

@Injectable()
export class ToolRegistry {
  constructor(
    private readonly live: LivescoreService,
    private readonly teams: TeamsService,
    private readonly news: NewsService,
  ) {}

  private readonly handlers: Record<string, Handler> = {
    getLiveMatches: () => this.live.getCurrent(),
    searchTeams: (a) =>
      this.teams.searchTeams(typeof a.query === 'string' ? a.query : ''),
    getTeamNews: (a) =>
      this.news.getByTeam(typeof a.team === 'string' ? a.team : ''),
  };

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
