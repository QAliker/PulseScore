import { ToolRegistry } from './tool-registry';

describe('ToolRegistry', () => {
  const live = { getCurrent: jest.fn().mockResolvedValue([{ id: 'm1' }]) };
  const teams = {
    searchTeams: jest.fn().mockResolvedValue([{ id: 't1', name: 'Arsenal' }]),
  };
  const news = { getByTeam: jest.fn().mockResolvedValue({ items: [] }) };
  const registry = new ToolRegistry(live as any, teams as any, news as any);

  it('exposes tool schemas for all handlers', () => {
    const names = registry.tools.map((t) => t.function.name).sort();
    expect(names).toEqual(['getLiveMatches', 'getTeamNews', 'searchTeams']);
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
