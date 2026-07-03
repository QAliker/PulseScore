import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import type {
  ChatCompletionMessage,
  ChatCompletionMessageParam,
  ChatCompletionTool,
} from 'openai/resources/chat/completions';

export const OPENAI_CLIENT = 'OPENAI_CLIENT';

export const openAiProvider = {
  provide: OPENAI_CLIENT,
  inject: [ConfigService],
  useFactory: (config: ConfigService): OpenAI =>
    new OpenAI({
      // ponytail: fall back to a placeholder so an unset LLM_API_KEY doesn't
      // throw at boot (the SDK rejects an empty key). Real calls without a key
      // just get a clean 401 from the provider instead of crashing the API.
      apiKey: config.get<string>('LLM_API_KEY') || 'missing-llm-api-key',
      baseURL: config.get<string>('LLM_BASE_URL'),
    }),
};

@Injectable()
export class LlmClient {
  constructor(
    @Inject(OPENAI_CLIENT) private readonly openai: OpenAI,
    private readonly config: ConfigService,
  ) {}

  async complete(
    messages: ChatCompletionMessageParam[],
    tools: ChatCompletionTool[],
  ): Promise<ChatCompletionMessage> {
    const res = await this.openai.chat.completions.create({
      model: this.config.get<string>('LLM_MODEL') ?? 'deepseek-chat',
      messages,
      tools: tools.length ? tools : undefined,
      tool_choice: 'auto',
    });
    return res.choices[0].message;
  }
}
