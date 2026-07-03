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
      apiKey: config.get<string>('LLM_API_KEY') ?? '',
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
