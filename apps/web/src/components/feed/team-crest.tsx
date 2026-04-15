import { cn } from '@/lib/utils';

// Simple two-letter monogram crest. Will swap to real club badges once assets land.
export function TeamCrest({
  shortName,
  size = 'md',
  side,
}: {
  shortName: string;
  size?: 'sm' | 'md' | 'lg';
  side: 'home' | 'away';
}) {
  const letters = shortName.slice(0, 3);
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
      {letters}
    </span>
  );
}
