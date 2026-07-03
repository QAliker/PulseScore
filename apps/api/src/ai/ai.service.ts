import { Injectable } from '@nestjs/common';
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions';
import { LlmClient } from './llm.client';
import { ToolRegistry } from './tool-registry';

export const MAX_ITERATIONS = 5;

const SYSTEM_PROMPT =
  'You are PulseScore, a helpful football assistant. Answer questions about ' +
  'live matches, upcoming fixtures, teams, and news using ONLY the provided ' +
  'tools and their results. For "today\'s matches" or "upcoming games", use ' +
  'getUpcomingFixtures. If a question is not about football, politely decline. ' +
  'Keep answers concise.';

@Injectable()
export class AiService {
  constructor(
    private readonly llm: LlmClient,
    private readonly registry: ToolRegistry,
  ) {}

  async chat(
    userMessages: ChatCompletionMessageParam[],
  ): Promise<{ answer: string; toolsUsed: string[] }> {
    // Sanitize client-supplied history to role + content only. The client may
    // attach extra fields (e.g. UI-only `sources`); forwarding them makes the
    // LLM provider reject the request with "property X is unsupported".
    const history: ChatCompletionMessageParam[] = userMessages.map((m) => ({
      role: m.role === 'assistant' ? 'assistant' : 'user',
      content: typeof m.content === 'string' ? m.content : '',
    }));
    const messages: ChatCompletionMessageParam[] = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...history,
    ];
    const toolsUsed: string[] = [];

    for (let i = 0; i < MAX_ITERATIONS; i++) {
      const message = await this.llm.complete(messages, this.registry.tools);
      messages.push(message);

      if (!message.tool_calls?.length) {
        return { answer: message.content ?? '', toolsUsed };
      }

      for (const call of message.tool_calls) {
        if (call.type !== 'function') continue;
        toolsUsed.push(call.function.name);
        let args: Record<string, unknown> = {};
        try {
          const parsed: unknown = JSON.parse(call.function.arguments || '{}');
          args =
            typeof parsed === 'object' && parsed !== null
              ? (parsed as Record<string, unknown>)
              : {};
        } catch {
          args = {};
        }
        const result = await this.registry.execute(call.function.name, args);
        messages.push({
          role: 'tool',
          tool_call_id: call.id,
          content: JSON.stringify(result),
        });
      }
    }

    return { answer: 'Sorry, I could not complete that request.', toolsUsed };
  }
}
