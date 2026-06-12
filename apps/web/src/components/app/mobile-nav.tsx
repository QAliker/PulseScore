'use client';

import { useState } from 'react';
import { Menu, Trophy, Calendar, BarChart2, Newspaper } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { LEAGUES } from '@/lib/leagues';
import { SidebarLink } from './sidebar-link';
import { LeagueLogo } from '@/components/feed/league-logo';

/** Hamburger + slide-in nav for viewports below the desktop sidebar (`lg`). */
export function MobileNav() {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          className="lg:hidden"
          aria-label="Open menu"
        >
          <Menu className="size-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-72 gap-0 p-0">
        <SheetTitle className="px-5 pt-5 pb-1 text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Menu
        </SheetTitle>
        {/* A click on any link bubbles up here and closes the drawer. */}
        <nav
          className="flex flex-col gap-6 overflow-y-auto px-3 py-4"
          onClick={() => setOpen(false)}
        >
          <div className="flex flex-col gap-1">
            <SidebarLink href="/" icon={<Trophy className="size-4" />} label="Today" exact />
            <SidebarLink href="/fixtures" icon={<Calendar className="size-4" />} label="Fixtures" />
            <SidebarLink href="/results" icon={<BarChart2 className="size-4" />} label="Results" />
            <SidebarLink href="/news" icon={<Newspaper className="size-4" />} label="News" />
          </div>

          <div className="flex flex-col gap-1">
            <h2 className="px-3 pb-1 text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Football
            </h2>
            {LEAGUES.map((l) => (
              <SidebarLink
                key={l.slug}
                href={`/leagues/${l.slug}`}
                icon={<LeagueLogo league={l} size={20} className="size-5" />}
                label={l.name}
                sublabel={l.country}
                countryCode={l.countryCode}
              />
            ))}
          </div>
        </nav>
      </SheetContent>
    </Sheet>
  );
}
