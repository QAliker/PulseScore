'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';

type Props = {
  photo?: string | null;
  name: string;
  number?: number;
  side: 'home' | 'away';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
};

const sizeMap = {
  sm: { outer: 'size-6', text: 'text-[0.55rem]' },
  md: { outer: 'size-9', text: 'text-[0.65rem]' },
  lg: { outer: 'size-11', text: 'text-xs' },
};

export function PlayerPhoto({ photo, name, number, side, size = 'md', className }: Props) {
  const [imgFailed, setImgFailed] = useState(false);
  const { outer, text } = sizeMap[size];

  const showPhoto = photo && !imgFailed;
  const fallback = number != null ? String(number) : name[0]?.toUpperCase() ?? '?';

  return (
    <div
      className={cn(
        outer,
        'relative shrink-0 overflow-hidden rounded-full ring-2',
        side === 'home'
          ? 'bg-home ring-home/40'
          : 'bg-away ring-away/40',
        className,
      )}
    >
      {showPhoto ? (
        <img
          src={photo}
          alt={name}
          className="size-full object-cover object-top"
          onError={() => setImgFailed(true)}
        />
      ) : (
        <span
          className={cn(
            'absolute inset-0 flex items-center justify-center font-bold tabular',
            text,
            side === 'home' ? 'text-primary-foreground' : 'text-away-foreground',
          )}
        >
          {fallback}
        </span>
      )}
    </div>
  );
}
