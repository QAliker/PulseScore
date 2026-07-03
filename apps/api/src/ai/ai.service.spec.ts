import { AiService } from './ai.service';

const registry = { tools: [], execute: jest.fn() } as any;

function makeService(complete: jest.Mock) {
  return new AiService({ complete } as any, registry);
}

describe('AiService', () => {
  beforeEach(() => registry.execute.mockReset());

  it('returns the answer when the model replies with content and no tool calls', async () => {
    const complete = jest
      .fn()
      .mockResolvedValue({ role: 'assistant', content: 'Hello!' });
    const result = await makeService(complete).chat([
      { role: 'user', content: 'hi' },
    ]);
    expect(result).toEqual({ answer: 'Hello!', toolsUsed: [] });
  });

  it('executes tool calls then returns the final content', async () => {
    registry.execute.mockResolvedValue([{ id: 'm1' }]);
    const complete = jest
      .fn()
      .mockResolvedValueOnce({
        role: 'assistant',
        content: null,
        tool_calls: [
          {
            id: 'c1',
            type: 'function',
            function: { name: 'getLiveMatches', arguments: '{}' },
          },
        ],
      })
      .mockResolvedValueOnce({ role: 'assistant', content: '1 live match' });

    const result = await makeService(complete).chat([
      { role: 'user', content: 'live?' },
    ]);

    expect(registry.execute).toHaveBeenCalledWith('getLiveMatches', {});
    expect(result).toEqual({
      answer: '1 live match',
      toolsUsed: ['getLiveMatches'],
    });
  });

  it('stops after MAX_ITERATIONS and returns a fallback answer', async () => {
    registry.execute.mockResolvedValue([]);
    const complete = jest.fn().mockResolvedValue({
      role: 'assistant',
      content: null,
      tool_calls: [
        {
          id: 'c1',
          type: 'function',
          function: { name: 'getLiveMatches', arguments: '{}' },
        },
      ],
    });
    const result = await makeService(complete).chat([
      { role: 'user', content: 'loop' },
    ]);
    expect(complete).toHaveBeenCalledTimes(5);
    expect(result.answer).toMatch(/could not|couldn't/i);
  });
});
