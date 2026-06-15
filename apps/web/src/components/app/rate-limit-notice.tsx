import Link from 'next/link';
import { Clock, ArrowLeft } from 'lucide-react';

/**
 * Full-page notice shown when an upstream data provider (e.g. Football-Data.org)
 * returns HTTP 429. The free tier caps requests per minute, so the data will be
 * available again shortly.
 */
export function RateLimitNotice({ backHref = '/' }: { backHref?: string }) {
  return (
    <div className="mx-auto flex max-w-[600px] flex-col items-center gap-6 px-4 py-20 text-center">
      <div className="flex size-16 items-center justify-center rounded-full bg-amber-500/15 ring-1 ring-amber-500/30">
        <Clock className="size-8 text-amber-500" />
      </div>
      <div className="flex flex-col gap-2">
        <h1 className="font-display text-2xl font-extrabold tracking-tight">
          Trop de requêtes
        </h1>
        <p className="text-sm text-muted-foreground">
          La limite de l&apos;API a été atteinte. Patiente une minute, le temps
          que de nouvelles requêtes soient disponibles, puis recharge la page.
        </p>
        <p className="text-sm text-muted-foreground">
          PulseScore est un petit projet perso qui utilise des API gratuites — je
          ne souhaite pas payer un abonnement, donc la limite de requêtes est vite
          atteinte.
        </p>
      </div>
      <Link
        href={backHref}
        className="inline-flex items-center gap-1.5 rounded-md border border-border/60 bg-card px-4 py-2 text-sm font-semibold transition-colors hover:bg-accent/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <ArrowLeft className="size-4" />
        Retour
      </Link>
    </div>
  );
}
