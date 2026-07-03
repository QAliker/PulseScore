import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { LlmClient, OPENAI_CLIENT } from './../src/ai/llm.client';
import { LivescoreService } from './../src/sports-data/services/livescore.service';

describe('POST /ai/chat (integration)', () => {
  let app: INestApplication;
  const getCurrent = jest
    .fn()
    .mockResolvedValue([
      { id: 'm1', homeTeam: { name: 'A' }, awayTeam: { name: 'B' } },
    ]);

  // Scripted LLM: first call asks for the tool, second returns the final answer.
  let call = 0;
  const complete = jest.fn().mockImplementation(() => {
    call += 1;
    if (call === 1) {
      return Promise.resolve({
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
    }
    return Promise.resolve({
      role: 'assistant',
      content: 'There is 1 live match: A vs B.',
    });
  });

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(LlmClient)
      .useValue({ complete })
      .overrideProvider(LivescoreService)
      .useValue({ getCurrent })
      // AiModule also registers a separate OPENAI_CLIENT factory provider that
      // eagerly constructs a real OpenAI SDK client at module init. Since
      // LLM_API_KEY is empty in this environment, that factory throws
      // ("Missing credentials") even though LlmClient itself is overridden
      // above. Overriding this token too keeps the real OpenAI SDK from
      // being constructed during boot.
      .overrideProvider(OPENAI_CLIENT)
      .useValue({})
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('runs the agent loop, calls the live-matches service, and returns an answer', async () => {
    const res = await request(app.getHttpServer())
      .post('/ai/chat')
      .send({ messages: [{ role: 'user', content: 'any live matches?' }] })
      .expect(201);

    expect(getCurrent).toHaveBeenCalled();
    expect(res.body.toolsUsed).toContain('getLiveMatches');
    expect(res.body.answer).toContain('live match');
  });

  it('rejects an empty messages array with 400', async () => {
    await request(app.getHttpServer())
      .post('/ai/chat')
      .send({ messages: [] })
      .expect(400);
  });
});
