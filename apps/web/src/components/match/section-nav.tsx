'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

type Section = { id: string; label: string };

const BASE_SECTIONS: Section[] = [
  { id: 'lineups', label: 'Lineups' },
  { id: 'events', label: 'Timeline' },
  { id: 'stats', label: 'Stats' },
  { id: 'injuries', label: 'Injuries' },
  { id: 'prediction', label: 'Prediction' },
  { id: 'h2h', label: 'H2H' },
];

type Props = {
  visibleSections?: string[];
};

export function SectionNav({ visibleSections }: Props) {
  const sections = visibleSections
    ? BASE_SECTIONS.filter((s) => visibleSections.includes(s.id))
    : BASE_SECTIONS;

  const [active, setActive] = useState<string>(sections[0]?.id ?? '');

  useEffect(() => {
    const ratios: Record<string, number> = {};
    const observers: IntersectionObserver[] = [];

    for (const { id } of sections) {
      const el = document.getElementById(id);
      if (!el) continue;
      const obs = new IntersectionObserver(
        ([entry]) => {
          ratios[id] = entry.intersectionRatio;
          const best = Object.entries(ratios).sort(([, a], [, b]) => b - a)[0];
          if (best && best[1] > 0) setActive(best[0]);
        },
        { threshold: [0, 0.25, 0.5, 0.75, 1], rootMargin: '-80px 0px -30% 0px' },
      );
      obs.observe(el);
      observers.push(obs);
    }

    return () => observers.forEach((o) => o.disconnect());
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visibleSections?.join(',')]);

  return (
    <nav
      className="sticky top-14 z-10 flex gap-1 overflow-x-auto border-b border-border/60 bg-background/90 py-2.5 backdrop-blur-sm"
      aria-label="Match sections"
    >
      {sections.map(({ id, label }) => (
        <button
          key={id}
          onClick={() =>
            document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
          }
          className={cn(
            'shrink-0 rounded-full px-3.5 py-1.5 text-[0.78rem] font-semibold transition-colors',
            active === id
              ? 'bg-foreground text-background'
              : 'text-muted-foreground hover:text-foreground',
          )}
          aria-current={active === id ? 'location' : undefined}
        >
          {label}
        </button>
      ))}
    </nav>
  );
}
