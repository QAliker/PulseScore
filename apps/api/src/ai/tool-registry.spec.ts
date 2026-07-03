import { ToolRegistry } from './tool-registry';

describe('ToolRegistry', () => {
  const live = { getCurrent: jest.fn().mockResolvedValue([{ id: 'm1' }]) };
  const teams = {
    searchTeams: jest.fn().mockResolvedValue([{ id: 't1', name: 'Arsenal' }]),
  };
  const news = { getByTeam: jest.fn().mockResolvedValue({ items: [] }) };
  const fixtures = {
    getLeagueFixtures: jest.fn().mockResolvedValue([
      {
        homeTeam: { name: 'Home' },
        awayTeam: { name: 'Away' },
        startTime: '2026-07-05T14:00:00Z',
        status: 'SCHEDULED',
      },
    ]),
  };
  const registry = new ToolRegistry(
    live as any,
    teams as any,
    news as any,
    fixtures as any,
  );

  it('exposes tool schemas for all handlers', () => {
    const names = registry.tools.map((t) => t.function.name).sort();
    expect(names).toEqual([
      'getLiveMatches',
      'getTeamNews',
      'getUpcomingFixtures',
      'searchTeams',
    ]);
  });

  it('aggregates upcoming fixtures across leagues, trimmed to essentials', async () => {
    const result = (await registry.execute('getUpcomingFixtures', {})) as any[];
    expect(fixtures.getLeagueFixtures).toHaveBeenCalled();
    expect(result[0]).toEqual({
      league: expect.any(String),
      home: 'Home',
      away: 'Away',
      kickoff: '2026-07-05T14:00:00Z',
      status: 'SCHEDULED',
    });
  });

  it('runs getLiveMatches', async () => {
    await expect(registry.execute('getLiveMatches', {})).resolves.toEqual([
      { id: 'm1' },
    ]);
    expect(live.getCurrent).toHaveBeenCalled();
  });

  it('runs searchTeams with query arg', async () => {
    await registry.execute('searchTeams', { query: 'ars' });
    expect(teams.searchTeams).toHaveBeenCalledWith('ars');
  });

  it('returns an error object for an unknown tool', async () => {
    await expect(registry.execute('nope', {})).resolves.toEqual({
      error: 'unknown tool: nope',
    });
  });

  it('returns an error object when a handler throws', async () => {
    news.getByTeam.mockRejectedValueOnce(new Error('boom'));
    const result = await registry.execute('getTeamNews', { team: 'x' });
    expect(result).toEqual({ error: 'boom' });
  });
});
