import Image from 'next/image';
import type { ApiCoach } from '@/lib/api-types';

type Props = { coaches: ApiCoach[] };

function formatCareerDates(start: string, end: string | null): string {
  const s = start.slice(0, 4);
  const e = end ? end.slice(0, 4) : 'present';
  return `${s} – ${e}`;
}

export function CoachCard({ coaches }: Props) {
  if (coaches.length === 0) return null;

  const coach = coaches[0];

  return (
    <div className="flex flex-col gap-6 p-5 sm:p-6">
      <div className="flex items-center gap-4">
        <div className="relative size-16 shrink-0 overflow-hidden rounded-full bg-muted sm:size-20">
          {coach.photo ? (
            <Image
              src={coach.photo}
              alt={coach.name}
              className="size-full object-cover"
              loading="lazy"
              width={80}
              height={80}
            />
          ) : (
            <span className="flex size-full items-center justify-center font-display text-2xl font-black text-muted-foreground">
              {coach.firstname?.[0] ?? '?'}
            </span>
          )}
        </div>

        <div className="flex flex-col gap-1">
          <h2 className="font-display text-xl font-extrabold tracking-tight sm:text-2xl">
            {coach.name}
          </h2>
          <p className="text-sm text-muted-foreground">
            {[coach.nationality, coach.age != null ? `${coach.age} yrs` : null]
              .filter(Boolean)
              .join(' · ')}
          </p>
        </div>
      </div>

      {coach.career.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <h3 className="text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Career
          </h3>
          <ul className="flex flex-col divide-y divide-border/40">
            {coach.career
              .slice()
              .sort((a, b) => (b.start > a.start ? 1 : -1))
              .map((entry, i) => (
                <li key={i} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="flex items-center gap-2.5">
                    {entry.teamLogo && (
                      <Image
                        src={entry.teamLogo}
                        alt={entry.teamName}
                        className="size-5 object-contain"
                        loading="lazy"
                        width={20}
                        height={20}
                      />
                    )}
                    <span className="text-sm font-medium">{entry.teamName}</span>
                  </div>
                  <time className="shrink-0 text-[0.72rem] tabular text-muted-foreground">
                    {formatCareerDates(entry.start, entry.end)}
                  </time>
                </li>
              ))}
          </ul>
        </div>
      )}
    </div>
  );
}
