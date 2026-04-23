import Image from 'next/image';
import { cn } from '@/lib/utils';

export function TeamCrest({
  shortName,
  logo,
  size = 'md',
  side,
}: {
  shortName: string;
  logo?: string;
  size?: 'sm' | 'md' | 'lg';
  side: 'home' | 'away';
}) {
  const dim = size === 'sm' ? 16 : size === 'md' ? 24 : 40;
  const cls = size === 'sm' ? 'size-6' : size === 'md' ? 'size-8' : 'size-12';

  if (logo) {
    return (
      <Image
        src={logo}
        alt={shortName}
        width={dim * 2}
        height={dim * 2}
        className={cn(cls, 'object-contain')}
        unoptimized
        aria-hidden
      />
    );
  }

  return (
    <span
      aria-hidden
      className={cn(
        'inline-flex items-center justify-center rounded-md font-display font-extrabold tabular tracking-tight',
        side === 'home'
          ? 'bg-primary/12 text-primary'
          : 'bg-positive/15 text-positive',
        size === 'sm' && 'size-6 text-[0.6rem]',
        size === 'md' && 'size-8 text-[0.7rem]',
        size === 'lg' && 'size-12 text-base',
      )}
    >
      {shortName.slice(0, 3)}
    </span>
  );
}
