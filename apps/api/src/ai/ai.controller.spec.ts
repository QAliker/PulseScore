import { BadRequestException } from '@nestjs/common';
import { AiController } from './ai.controller';

describe('AiController', () => {
  const aiService = {
    chat: jest.fn().mockResolvedValue({ answer: 'ok', toolsUsed: [] }),
  };
  const controller = new AiController(aiService as any);

  it('rejects a request with no messages', async () => {
    await expect(controller.chat({ messages: [] })).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('passes messages to AiService and returns its result', async () => {
    const body = { messages: [{ role: 'user' as const, content: 'hi' }] };
    const result = await controller.chat(body);
    expect(aiService.chat).toHaveBeenCalledWith(body.messages);
    expect(result).toEqual({ answer: 'ok', toolsUsed: [] });
  });
});
