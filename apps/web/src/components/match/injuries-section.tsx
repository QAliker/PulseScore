import type { ApiInjury } from '@/lib/api-types';

type Props = {
  injuries: ApiInjury[];
  homeTeamId: string;
  awayTeamId: string;
  homeTeamName: string;
  awayTeamName: string;
};

function InjuryList({ injuries }: { injuries: ApiInjury[] }) {
  if (injuries.length === 0) {
    return (
      <p className="py-2 text-sm italic text-muted-foreground">None reported</p>
    );
  }

  return (
    <ul className="flex flex-col divide-y divide-border/40">
      {injuries.map((inj, i) => (
        <li key={i} className="flex flex-col gap-0.5 py-2.5">
          <span className="text-sm font-semibold leading-snug">{inj.playerName}</span>
          <span className="text-[0.72rem] text-muted-foreground">
            {inj.type}
            {inj.reason ? ` · ${inj.reason}` : ''}
          </span>
        </li>
      ))}
    </ul>
  );
}

export function InjuriesSection({
  injuries,
  homeTeamId,
  awayTeamId,
  homeTeamName,
  awayTeamName,
}: Props) {
  const homeInjuries = injuries.filter(
    (i) => String(i.teamId) === homeTeamId,
  );
  const awayInjuries = injuries.filter(
    (i) => String(i.teamId) === awayTeamId,
  );

  if (injuries.length === 0) {
    return (
      <div className="px-4 py-6 sm:px-6">
        <p className="text-sm italic text-muted-foreground">No injury reports for this fixture.</p>
      </div>
    );
  }

  return (
    <div className="grid gap-6 p-4 sm:grid-cols-2 sm:p-6">
      <div className="flex flex-col gap-2">
        <h3 className="text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          {homeTeamName}
        </h3>
        <InjuryList injuries={homeInjuries} />
      </div>

      <div className="flex flex-col gap-2">
        <h3 className="text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          {awayTeamName}
        </h3>
        <InjuryList injuries={awayInjuries} />
      </div>
    </div>
  );
}
