import type { ApiTeam } from '@/lib/api-types';
import Image from 'next/image';

type Props = { team: ApiTeam };

export function TeamHeader({ team }: Props) {
  return (
    <div className="flex items-center gap-4">
      {team.logo && (
        <Image
          src={team.logo}
          alt={team.name}
          className="size-16 object-contain sm:size-20"
          loading="lazy"
        />
      )}
      <div className="flex flex-col gap-0.5">
        <h1 className="font-display text-2xl font-extrabold tracking-tight sm:text-3xl">
          {team.name}
        </h1>
        {team.country && (
          <p className="text-sm text-muted-foreground">{team.country}</p>
        )}
      </div>
    </div>
  );
}
