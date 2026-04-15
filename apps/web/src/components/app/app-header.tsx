import Link from 'next/link';
import { Search } from 'lucide-react';
import { ThemeToggle } from '@/components/theme/theme-toggle';
import { LiveConnectionBadge } from './live-connection-badge';
import { SoundToggle } from './sound-toggle';

export function AppHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-border/60 bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70">
      <div className="flex h-14 items-center gap-4 px-4 lg:px-6">
        <Link
          href="/"
          className="group flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-md -mx-1 px-1"
        >
          <PulseLogo />
          <span className="font-display text-[1.35rem] font-900 leading-none tracking-tight">
            PULSESCORE
          </span>
          <span className="hidden text-[0.7rem] font-medium uppercase tracking-[0.18em] text-muted-foreground sm:inline">
            Arena
          </span>
        </Link>

        <div className="ml-auto flex items-center gap-2">
          <div className="hidden min-w-[220px] items-center gap-2 rounded-md border border-input bg-secondary/50 px-3 py-1.5 text-sm text-muted-foreground md:flex">
            <Search className="size-4" aria-hidden />
            <span>Search teams, matches, leagues</span>
            <kbd className="ml-auto rounded bg-background/60 px-1.5 py-0.5 font-mono text-[0.65rem] text-muted-foreground">
              ⌘K
            </kbd>
          </div>
          <LiveConnectionBadge />
          <SoundToggle />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}

function PulseLogo() {
  return (
    <span
      aria-hidden
      className="relative inline-flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground"
    >
      <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth={2.6}>
        <path d="M3 12h3l2-6 4 12 2-6 2 3h5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span className="absolute -bottom-0.5 -right-0.5 size-2 rounded-full bg-live ring-2 ring-background live-dot" />
    </span>
  );
}
