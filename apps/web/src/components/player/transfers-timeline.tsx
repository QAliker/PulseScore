import Image from 'next/image';
import type { ApiTransfers } from '@/lib/api-types';

type Props = { transfers: ApiTransfers };

const TRANSFER_TYPE_STYLE: Record<string, string> = {
  Free: 'bg-muted text-muted-foreground',
  Loan: 'bg-amber-500/12 text-amber-700 dark:text-amber-400',
  'N/A': 'bg-muted/60 text-muted-foreground/60',
};

function typeStyle(type: string): string {
  if (type in TRANSFER_TYPE_STYLE) return TRANSFER_TYPE_STYLE[type];
  return 'bg-primary/10 text-primary';
}

function ClubLogo({ logo, name }: { logo: string; name: string }) {
  if (!logo) {
    return (
      <span className="flex size-5 items-center justify-center rounded-full bg-muted text-[0.5rem] font-black text-muted-foreground">
        {name[0]}
      </span>
    );
  }
  return (
    <Image
      src={logo}
      alt={name}
      className="size-5 object-contain"
      loading="lazy"
      width={20}
      height={20}
    />
  );
}

export function TransfersTimeline({ transfers }: Props) {
  if (transfers.transfers.length === 0) {
    return (
      <p className="px-4 py-6 text-sm italic text-muted-foreground sm:px-6">
        No transfer records found.
      </p>
    );
  }

  const sorted = transfers.transfers
    .slice()
    .sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div className="flex flex-col divide-y divide-border/40 px-4 sm:px-6">
      {sorted.map((entry, i) => (
        <div key={i} className="grid grid-cols-[4rem_1fr_auto] items-center gap-3 py-3 sm:gap-4">
          <time className="text-[0.72rem] tabular text-muted-foreground">
            {entry.date.slice(0, 7)}
          </time>

          <div className="flex min-w-0 items-center gap-2 text-sm">
            <ClubLogo logo={entry.teamOutLogo} name={entry.teamOutName} />
            <span className="truncate font-medium">{entry.teamOutName}</span>
            <span className="shrink-0 text-muted-foreground/60">→</span>
            <ClubLogo logo={entry.teamInLogo} name={entry.teamInName} />
            <span className="truncate font-medium">{entry.teamInName}</span>
          </div>

          <span
            className={`shrink-0 rounded px-1.5 py-0.5 text-[0.65rem] font-semibold uppercase tracking-[0.08em] ${typeStyle(entry.type)}`}
          >
            {entry.type}
          </span>
        </div>
      ))}
    </div>
  );
}
