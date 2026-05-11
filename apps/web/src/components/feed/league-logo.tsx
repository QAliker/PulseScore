import Image from 'next/image';
import type { League } from '@/lib/leagues';
import { cn } from '@/lib/utils';

export function LeagueLogo({
  league,
  size = 28,
  className,
}: {
  league: Pick<League, 'logo' | 'name' | 'darkInvert'>;
  size?: number;
  className?: string;
}) {
  return (
    <Image
      src={league.logo}
      alt={league.name}
      width={size}
      height={size}
      className={cn('object-contain', league.darkInvert && 'dark:invert', className)}
      unoptimized
    />
  );
}
