import Link from 'next/link';
import Image from 'next/image';
import { Trophy, Calendar } from 'lucide-react';
import { LEAGUES } from '@/lib/leagues';
import { apiFetch } from '@/lib/api';
import type { ApiMatch } from '@/lib/api-types';

async function fetchLeagueLogos(): Promise<Record<number, string | null>> {
  const results = await Promise.allSettled(
    LEAGUES.map((l) =>
      apiFetch<ApiMatch[]>(`/leagues/${l.apiFootballId}/fixtures`, {
        next: { revalidate: 3600 },
      }),
    ),
  );

  return Object.fromEntries(
    LEAGUES.map((l, i) => {
      const r = results[i];
      const logo =
        r.status === 'fulfilled' ? (r.value[0]?.league?.logo ?? null) : null;
      return [l.apiFootballId, logo];
    }),
  );
}

export async function AppSidebar() {
  const logos = await fetchLeagueLogos();

  return (
    <aside className="hidden border-r border-border/60 bg-sidebar/60 lg:block">
      <nav className="sticky top-14 flex flex-col gap-6 px-3 py-6">
        <SidebarSection label="Quick">
          <SidebarLink href="/" icon={<Trophy className="size-4" />} label="All matches" active />
          <SidebarLink
            href="/schedule"
            icon={<Calendar className="size-4" />}
            label="Schedule"
          />
        </SidebarSection>

        <SidebarSection label="Football">
          {LEAGUES.map((l) => {
            const logo = logos[l.apiFootballId];
            const icon = logo ? (
              <Image
                src={logo}
                alt={l.name}
                width={20}
                height={20}
                className="size-5 object-contain"
                unoptimized
              />
            ) : (
              <span className="text-[1.05rem] leading-none">{l.flag}</span>
            );
            return (
              <SidebarLink
                key={l.slug}
                href={`/leagues/${l.slug}`}
                icon={icon}
                label={l.name}
                sublabel={l.country}
              />
            );
          })}
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
