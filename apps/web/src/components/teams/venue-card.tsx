import Image from 'next/image';
import type { ApiVenue } from '@/lib/api-types';

type Props = { venue: ApiVenue };

export function VenueCard({ venue }: Props) {
  const location = [venue.city, venue.country].filter(Boolean).join(', ');

  return (
    <div className="flex flex-col gap-4 overflow-hidden rounded-xl border border-border/60 bg-card">
      {venue.image && (
        <div className="relative h-36 w-full overflow-hidden bg-muted sm:h-44">
          <Image
            src={venue.image}
            alt={venue.name}
            className="size-full object-cover"
            loading="lazy"
            width={600}
            height={176}
          />
        </div>
      )}

      <div className="flex flex-col gap-4 px-4 pb-4 sm:px-5 sm:pb-5">
        <div className="flex flex-col gap-0.5">
          <h3 className="font-display text-lg font-extrabold tracking-tight">
            {venue.name}
          </h3>
          {location && (
            <p className="text-sm text-muted-foreground">{location}</p>
          )}
          {venue.address && (
            <p className="text-xs text-muted-foreground/70">{venue.address}</p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          {venue.capacity != null && (
            <div className="flex flex-col gap-0.5">
              <span className="text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Capacity
              </span>
              <span className="font-semibold tabular">
                {venue.capacity.toLocaleString()}
              </span>
            </div>
          )}

          {venue.surface && (
            <div className="flex flex-col gap-0.5">
              <span className="text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Surface
              </span>
              <span className="font-semibold capitalize">{venue.surface}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
