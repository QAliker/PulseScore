'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

type Props = {
  href: string;
  icon: React.ReactNode;
  label: string;
  sublabel?: string;
  badge?: string;
  exact?: boolean;
};

export function SidebarLink({ href, icon, label, sublabel, badge, exact = false }: Props) {
  const pathname = usePathname();
  const isActive = exact ? pathname === href : pathname.startsWith(href);

  return (
    <Link
      href={href}
      className={cn(
        'group flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        isActive
          ? 'bg-sidebar-accent text-sidebar-accent-foreground font-semibold'
          : 'text-sidebar-foreground/85 hover:bg-sidebar-accent/70 hover:text-sidebar-accent-foreground',
      )}
      aria-current={isActive ? 'page' : undefined}
    >
      <span className="flex size-6 items-center justify-center text-muted-foreground group-hover:text-sidebar-accent-foreground">
        {icon}
      </span>
      <span className="flex min-w-0 flex-col">
        <span className="truncate">{label}</span>
        {sublabel && (
          <span className="text-[0.7rem] font-normal text-muted-foreground">{sublabel}</span>
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
