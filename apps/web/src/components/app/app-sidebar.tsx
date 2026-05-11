import { Trophy, Calendar, BarChart2 } from 'lucide-react';
import { LEAGUES } from '@/lib/leagues';
import { SidebarLink } from './sidebar-link';
import { LeagueLogo } from '@/components/feed/league-logo';

export function AppSidebar() {

  return (
    <aside className="hidden border-r border-border/60 bg-sidebar/60 lg:block">
      <nav className="sticky top-14 flex flex-col gap-6 px-3 py-6">
        <SidebarSection label="Quick">
          <SidebarLink href="/" icon={<Trophy className="size-4" />} label="Today" exact />
          <SidebarLink href="/fixtures" icon={<Calendar className="size-4" />} label="Fixtures" />
          <SidebarLink href="/results" icon={<BarChart2 className="size-4" />} label="Results" />
        </SidebarSection>

        <SidebarSection label="Football">
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
        </SidebarSection>
      </nav>
    </aside>
  );
}

function SidebarSection({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <h2 className="px-3 pb-1 text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </h2>
      {children}
    </div>
  );
}

