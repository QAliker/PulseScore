import Link from 'next/link';

interface Props {
  rounds: number[];
  currentRound: number | null;
  showAll?: boolean;
  extraParams?: Record<string, string>;
  basePath: string;
}

function href(basePath: string, round: number | null, extraParams?: Record<string, string>, all?: boolean) {
  const p = new URLSearchParams(extraParams);
  if (all) {
    p.set('all', '1');
  } else if (round != null) {
    p.set('round', String(round));
  }
  const qs = p.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}

export function RoundSelector({ rounds, currentRound, showAll = false, extraParams, basePath }: Props) {
  if (rounds.length === 0) return null;

  const pillBase =
    'rounded-full px-3 py-1 text-[0.76rem] font-semibold transition-colors';
  const active = 'bg-foreground text-background';
  const idle = 'text-muted-foreground hover:text-foreground';

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      <span className="mr-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground/60 select-none">
        Journée
      </span>
      <Link
        href={href(basePath, null, extraParams, true)}
        className={`${pillBase} ${showAll ? active : idle}`}
      >
        Tout
      </Link>
      {rounds.map((r) => (
        <Link
          key={r}
          href={href(basePath, r, extraParams)}
          className={`${pillBase} ${currentRound === r ? active : idle}`}
        >
          J.{r}
        </Link>
      ))}
    </div>
  );
}
