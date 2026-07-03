const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface AiReply {
  answer: string;
  /** Names of the backend tools the agent called to build this answer. */
  toolsUsed: string[];
}

export async function askAi(messages: ChatMessage[]): Promise<AiReply> {
  const res = await fetch(`${API_BASE}/ai/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    // Send only role + content; UI-only fields (e.g. sources) must not leak to the LLM.
    body: JSON.stringify({
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
    }),
  });
  if (res.status === 429) {
    throw new Error('Too many questions at once — give it a few seconds.');
  }
  if (!res.ok) throw new Error(`AI request failed: ${res.status}`);
  const data = (await res.json()) as { answer: string; toolsUsed?: string[] };
  return { answer: data.answer, toolsUsed: data.toolsUsed ?? [] };
}
