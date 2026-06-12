import Link from 'next/link';
import Image from 'next/image';
import { ThemeToggle } from '@/components/theme/theme-toggle';
import { LiveConnectionBadge } from './live-connection-badge';
import { SoundToggle } from './sound-toggle';
import { SearchPalette } from './search-palette';
import { MobileNav } from './mobile-nav';

export function AppHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-border/60 bg-background/85 backdrop-blur supports-backdrop-filter:bg-background/70">
      <div className="flex h-14 items-center gap-3 px-4 lg:px-6">
        <MobileNav />

        <Link
          href="/"
          className="group flex shrink-0 items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-md -mx-1 px-1"
        >
          <Image
            src="/PulseScore_Logo__2.png"
            alt="PulseScore"
            width={331}
            height={146}
            priority
            className="h-11 w-auto rounded-md dark:brightness-0 dark:invert"
          />
        </Link>

        <div className="mx-2 h-5 w-px bg-border/60 hidden md:block" aria-hidden />

        <div className="ml-auto flex items-center gap-2">
          <SearchPalette />
          <LiveConnectionBadge />
          <SoundToggle />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
