import Link from 'next/link';
import { Star, Trophy, Calendar } from 'lucide-react';
import { LEAGUES } from '@/lib/leagues';

export function AppSidebar() {
  return (
    <aside className="hidden border-r border-border/60 bg-sidebar/60 lg:block">
      <nav className="sticky top-14 flex flex-col gap-6 px-3 py-6">
        <SidebarSection label="Quick">
          <SidebarLink href="/" icon={<Trophy className="size-4" />} label="All matches" active />
          <SidebarLink href="/favorites" icon={<Star className="size-4" />} label="Favorites" badge="0" />
          <SidebarLink
            href="/schedule"
            icon={<Calendar className="size-4" />}
            label="Schedule"
          />
        </SidebarSection>

        <SidebarSection label="Football">
          {LEAGUES.map((l) => (
            <SidebarLink
              key={l.slug}
              href={`/leagues/${l.slug}`}
              icon={<span className="text-[1.05rem] leading-none">{l.flag}</span>}
              label={l.name}
              sublabel={l.country}
            />
          ))}
        </SidebarSection>

        <p className="px-3 pt-4 text-[0.68rem] uppercase tracking-[0.14em] text-muted-foreground">
          Free tier · 2 leagues
        </p>
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

function SidebarLink({
  href,
  icon,
  label,
  sublabel,
  badge,
  active,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  sublabel?: string;
  badge?: string;
  active?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`group flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
        active
          ? 'bg-sidebar-accent text-sidebar-accent-foreground font-semibold'
          : 'text-sidebar-foreground/85 hover:bg-sidebar-accent/70 hover:text-sidebar-accent-foreground'
      }`}
    >
      <span className="flex size-6 items-center justify-center text-muted-foreground group-hover:text-sidebar-accent-foreground">
        {icon}
      </span>
      <span className="flex min-w-0 flex-col">
        <span className="truncate">{label}</span>
        {sublabel && (
          <span className="text-[0.7rem] font-normal text-muted-foreground">
            {sublabel}
          </span>
        )}
      </span>
      {badge && (
        <span className="ml-auto rounded-full bg-secondary px-2 py-0.5 text-[0.7rem] font-medium tabular">
          {badge}
        </span>
      )}
    </Link>
  );
}
