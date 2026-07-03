import { LlmClient } from './llm.client';

describe('LlmClient', () => {
  it('calls the OpenAI SDK with model + tools and returns the assistant message', async () => {
    const message = { role: 'assistant', content: 'hi', tool_calls: undefined };
    const create = jest.fn().mockResolvedValue({ choices: [{ message }] });
    const fakeOpenAI = { chat: { completions: { create } } } as any;
    const config = { get: jest.fn().mockReturnValue('deepseek-chat') } as any;

    const client = new LlmClient(fakeOpenAI, config);
    const result = await client.complete([{ role: 'user', content: 'yo' }], []);

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({ model: 'deepseek-chat', tool_choice: 'auto' }),
    );
    expect(result).toBe(message);
  });
});
