'use client';

import { useEffect, useRef, useState } from 'react';
import { askAi, type ChatMessage } from '@/lib/ai';

interface Msg extends ChatMessage {
  /** Backend tools the agent used — shown as provenance chips on answers. */
  sources?: string[];
  error?: boolean;
}

/** Map backend tool names to human labels for the provenance chips. */
const TOOL_LABELS: Record<string, string> = {
  getLiveMatches: 'Live matches',
  getUpcomingFixtures: 'Fixtures',
  searchTeams: 'Team search',
  getTeamNews: 'News',
};

/** Starter prompts — each exercises one of the agent's real tools. */
const SUGGESTIONS = [
  'Any live matches right now?',
  "What are today's fixtures?",
  'Latest news on Arsenal',
];

function PulseMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M2 12h4l2.5-7 5 14 2.5-7H22"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function ChatPanel() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages, loading]);

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || loading) return;
    const next: Msg[] = [...messages, { role: 'user', content: trimmed }];
    setMessages(next);
    setInput('');
    setLoading(true);
    try {
      const reply = await askAi(next);
      setMessages([
        ...next,
        { role: 'assistant', content: reply.answer, sources: reply.toolsUsed },
      ]);
    } catch (err) {
      const content =
        err instanceof Error ? err.message : 'Something went wrong. Try again.';
      setMessages([...next, { role: 'assistant', content, error: true }]);
    } finally {
      setLoading(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        aria-label="Ask the PulseScore assistant"
        className="group fixed bottom-6 right-6 z-50 flex items-center gap-2.5 rounded-full bg-primary py-3 pl-3.5 pr-5 text-primary-foreground shadow-lg shadow-primary/25 transition-transform duration-200 ease-out hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        <span className="relative flex size-2.5">
          <span className="absolute inline-flex h-full w-full rounded-full bg-live opacity-75 motion-safe:animate-ping" />
          <span className="relative inline-flex size-2.5 rounded-full bg-live" />
        </span>
        <span className="font-display text-lg uppercase leading-none tracking-wide">
          Ask&nbsp;AI
        </span>
      </button>
    );
  }

  return (
    <section
      role="dialog"
      aria-label="PulseScore assistant"
      onKeyDown={(e) => e.key === 'Escape' && setOpen(false)}
      className="fixed bottom-6 right-6 z-50 flex h-[min(34rem,72vh)] w-[min(24rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border border-border bg-card text-card-foreground shadow-xl shadow-primary/10 motion-safe:animate-in motion-safe:fade-in-0 motion-safe:zoom-in-95 motion-safe:slide-in-from-bottom-4 motion-safe:duration-200"
    >
      {/* Header */}
      <header className="flex items-center gap-3 border-b border-border px-4 py-3">
        <span className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
          <PulseMark className="size-5" />
        </span>
        <div className="flex-1">
          <h2 className="font-display text-xl uppercase leading-none tracking-wide">
            PulseScore&nbsp;AI
          </h2>
          <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="size-1.5 rounded-full bg-live" />
            Football assistant
          </p>
        </div>
        <button
          onClick={() => setOpen(false)}
          aria-label="Close assistant"
          className="grid size-8 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <svg viewBox="0 0 24 24" className="size-4" aria-hidden="true">
            <path
              d="M6 6l12 12M18 6L6 18"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </header>

      {/* Messages */}
      <div
        ref={scrollRef}
        className="flex-1 space-y-3 overflow-y-auto px-4 py-4"
        aria-live="polite"
      >
        {messages.length === 0 ? (
          <div className="flex h-full flex-col justify-end gap-4">
            <p className="text-sm leading-relaxed text-muted-foreground">
              Ask about live scores, teams, or the latest football news. I read
              from PulseScore&apos;s live data.
            </p>
            <div className="flex flex-col items-start gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => void send(s)}
                  className="rounded-full border border-border px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:border-primary/40 hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((m, i) => (
            <div
              key={i}
              className={`flex flex-col motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-1 ${
                m.role === 'user' ? 'items-end' : 'items-start'
              }`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed ${
                  m.role === 'user'
                    ? 'rounded-br-sm bg-primary text-primary-foreground'
                    : m.error
                      ? 'rounded-bl-sm bg-destructive/10 text-destructive'
                      : 'rounded-bl-sm bg-secondary text-secondary-foreground'
                }`}
              >
                {m.content}
              </div>
              {m.sources && m.sources.length > 0 && (
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {[...new Set(m.sources)].map((tool) => (
                    <span
                      key={tool}
                      className="inline-flex items-center gap-1 rounded-full bg-pitch/10 px-2 py-0.5 text-[0.6875rem] font-medium text-pitch"
                    >
                      <span className="size-1 rounded-full bg-pitch" />
                      {TOOL_LABELS[tool] ?? tool}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))
        )}

        {loading && (
          <div className="flex items-start">
            <div className="flex gap-1 rounded-2xl rounded-bl-sm bg-secondary px-3.5 py-3">
              {[0, 150, 300].map((delay) => (
                <span
                  key={delay}
                  className="size-1.5 rounded-full bg-live motion-safe:animate-pulse"
                  style={{ animationDelay: `${delay}ms` }}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Composer */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void send(input);
        }}
        className="flex items-center gap-2 border-t border-border p-3"
      >
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about football…"
          className="min-w-0 flex-1 rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          aria-label="Send"
          className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card"
        >
          <svg viewBox="0 0 24 24" className="size-5" aria-hidden="true">
            <path
              d="M12 19V5M6 11l6-6 6 6"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </form>
    </section>
  );
}
