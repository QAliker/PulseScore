# English Language Sweep + Champion Card — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the web UI English-only and show a polished champion card on a league's `fixtures` tab when its season is finished.

**Architecture:** Pure `apps/web` frontend work. The champion uses the existing backend `GET /leagues/:id/season` (`ApiSeason`, already typed in `api-types.ts`) plus the standings list for the winner's badge. Language sweep is direct string replacement (site is English-only; no i18n framework).

**Tech Stack:** Next.js 16 (App Router, RSC), TypeScript, Tailwind, lucide-react icons.

> **No test harness for web** (Jest is API-only). Frontend tasks verify with `npm run lint` + `npm run build` + a manual French grep. There are no unit-test steps.

> **Commits:** Commit steps are included per plan convention. Per project rule ([[feedback_no_commit]]), the executor performs `git commit` **only when the user explicitly says so** — otherwise stage/leave changes and report.

---

## Translation dictionary (canonical — reuse everywhere)

| French | English |
|---|---|
| Classement | Standings |
| Classement indisponible — clé API requise. | Standings unavailable — API key required. |
| Buteurs | Scorers |
| Résultats | Results |
| Fixtures | Fixtures |
| Toutes les ligues | All leagues |
| Aucun résultat — clé API requise. | No results — API key required. |
| Aucun match à venir — clé API requise. | No upcoming matches — API key required. |
| Aucune rencontre à venir. | No upcoming matches. |
| Aucun match disponible. | No matches available. |
| Aucun joueur disponible. | No players available. |
| Aucune information disponible. | No information available. |
| Aucun palmarès trouvé. | No trophies found. |
| Gardiens | Goalkeepers |
| Défenseur / Défenseurs | Defender / Defenders |
| Milieux | Midfielders |
| Attaquants | Forwards |
| Données temporairement indisponibles | Temporarily unavailable |
| Ces informations seront disponibles dans quelques instants. | This information will be available shortly. |
| Limite de requêtes atteinte | Rate limit reached |
| L'API autorise 10 requêtes par minute. Patientez quelques secondes puis rechargez la page. | The API allows 10 requests per minute. Wait a few seconds, then reload the page. |
| Saison terminée | Season over |
| Le championnat s'est achevé le ${endLabel}. | The season ended on ${endLabel}. |
| Le championnat est terminé. | The season is over. |
| Les matchs reprendront la saison prochaine. | Matches resume next season. |
| Blessés | Injured |
| Prochains matchs | Upcoming matches |
| Matchs récents | Recent matches |
| Journée | Matchday |
| Palmarès | Trophies |
| Numéro | Number |
| Nationalité | Nationality |
| Contrat début | Contract start |
| Fondé en | Founded |
| Encaissés / M | Conceded / M |
| ` pén.` (penalties suffix) | ` pen.` |
| Le classement des buteurs de {league.name} apparaîtra dès les premiers buts de la saison. | The {league.name} scorers ranking will appear after the season's first goals. |
| Match précédent (aria-label) | Previous match |

Date formatting: change any `Intl.DateTimeFormat('fr-FR', …)` to `'en-GB'`.

---

## Task 1: ChampionCard component

**Files:**
- Create: `apps/web/src/components/leagues/champion-card.tsx`

- [ ] **Step 1: Create the component**

```tsx
import Link from 'next/link';
import Image from 'next/image';
import { Trophy } from 'lucide-react';
import type { League } from '@/lib/leagues';

type ChampionCardProps = {
  league: League;
  teamName: string;
  teamBadge: string | null;
  teamId?: string;
};

export function ChampionCard({ league, teamName, teamBadge, teamId }: ChampionCardProps) {
  const inner = (
    <div className="relative flex flex-col items-center gap-4 overflow-hidden rounded-xl border border-amber-500/30 bg-gradient-to-b from-amber-500/[0.10] to-amber-500/[0.02] px-6 py-12 text-center">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 -top-24 mx-auto h-48 w-48 rounded-full bg-amber-400/20 blur-3xl"
      />
      <div className="relative flex size-14 items-center justify-center rounded-full bg-amber-500/15 ring-1 ring-amber-500/30">
        <Trophy className="size-7 text-amber-500" />
      </div>
      <p className="relative text-[0.7rem] font-bold uppercase tracking-[0.2em] text-amber-600 dark:text-amber-400">
        Champions {league.season}
      </p>
      <div className="relative flex flex-col items-center gap-3">
        {teamBadge && (
          <Image
            src={teamBadge}
            alt={teamName}
            width={72}
            height={72}
            className="size-18 object-contain drop-shadow-sm"
            unoptimized
          />
        )}
        <h3 className="font-display text-2xl font-extrabold tracking-tight sm:text-3xl">
          {teamName}
        </h3>
      </div>
      <p className="relative text-xs text-muted-foreground">
        {league.name} · Season complete
      </p>
    </div>
  );

  return teamId ? (
    <Link href={`/teams/${teamId}`} className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-xl">
      {inner}
    </Link>
  ) : (
    inner
  );
}
```

- [ ] **Step 2: (Optional polish) craft with /impeccable**

Invoke the `/impeccable` skill on `apps/web/src/components/leagues/champion-card.tsx` to elevate the visual quality (confetti/laurel accents, refined gold treatment) while keeping the same props interface. Skip if time-constrained — the baseline above is production-acceptable.

- [ ] **Step 3: Verify it compiles**

Run: `npm run lint`
Expected: no errors referencing `champion-card.tsx`. (`size-18` requires Tailwind arbitrary support; if lint/build flags it, replace `size-18` with `h-[72px] w-[72px]`.)

- [ ] **Step 4: Commit (only if user authorized — see header)**

```bash
git add apps/web/src/components/leagues/champion-card.tsx
git commit -m "feat(web): add ChampionCard component"
```

---

## Task 2: Wire champion into leagues page + translate tabs/nav/empty states

**Files:**
- Modify: `apps/web/src/app/leagues/[slug]/page.tsx`

- [ ] **Step 1: Add imports**

Add to the import block (top of file):

```tsx
import { ChampionCard } from '@/components/leagues/champion-card';
```

And extend the api-types import to include `ApiSeason`:

```tsx
import type { ApiStanding, ApiMatch, ApiScorer, ApiSeason } from '@/lib/api-types';
```

- [ ] **Step 2: Fetch standings + season on the fixtures tab**

In the `Promise.allSettled([...])` call, the first element currently fetches standings only when `tab === 'standings'`. Change it to also fetch on the fixtures tab, and add a season fetch as a new array element.

Change:
```tsx
      tab === 'standings'
        ? apiFetch<ApiStanding[]>(`/leagues/${league.apiFootballId}/standings`)
        : Promise.resolve([] as ApiStanding[]),
```
to:
```tsx
      tab === 'standings' || tab === 'fixtures'
        ? apiFetch<ApiStanding[]>(`/leagues/${league.apiFootballId}/standings`)
        : Promise.resolve([] as ApiStanding[]),
```

Add a new element at the end of the `Promise.allSettled` array (after the scorers fetch):
```tsx
      tab === 'fixtures'
        ? apiFetch<ApiSeason | null>(`/leagues/${league.apiFootballId}/season`)
        : Promise.resolve(null),
```

And update the destructuring to capture it:
```tsx
  const [standingsResult, matchesResult, fixturesResult, scorersResult, seasonResult] =
    await Promise.allSettled([
```

- [ ] **Step 3: Resolve the champion**

After the existing `const standings = ...` / `const scorers = ...` lines, add:

```tsx
  const season =
    seasonResult.status === 'fulfilled' ? seasonResult.value : null;

  const champion = (() => {
    if (tab !== 'fixtures' || !season?.finished) return null;
    const byName = season.winnerName
      ? standings.find((s) => s.teamName === season.winnerName)
      : undefined;
    const top = standings.find((s) => s.position === 1) ?? standings[0];
    const src = byName ?? top;
    const teamName = season.winnerName ?? src?.teamName ?? '';
    if (!teamName) return null;
    return { teamName, teamBadge: src?.teamBadge ?? null, teamId: src?.teamId };
  })();
```

- [ ] **Step 4: Translate the "Toutes les ligues" link**

Change `Toutes les ligues` to `All leagues`.

- [ ] **Step 5: Translate the tabs array**

Change:
```tsx
  const tabs: { id: Tab; label: string }[] = [
    { id: 'standings', label: 'Classement' },
    { id: 'scorers', label: 'Buteurs' },
    { id: 'results', label: 'Résultats' },
    { id: 'fixtures', label: 'Fixtures' },
  ];
```
to:
```tsx
  const tabs: { id: Tab; label: string }[] = [
    { id: 'standings', label: 'Standings' },
    { id: 'scorers', label: 'Scorers' },
    { id: 'results', label: 'Results' },
    { id: 'fixtures', label: 'Fixtures' },
  ];
```

- [ ] **Step 6: Translate the standings empty state**

Change `Classement indisponible — clé API requise.` to `Standings unavailable — API key required.`

- [ ] **Step 7: Render the champion card and translate fixture/result empty states**

Replace the `(tab === 'results' || tab === 'fixtures')` block body:

```tsx
        {(tab === 'results' || tab === 'fixtures') && (
          champion ? (
            <ChampionCard
              league={league}
              teamName={champion.teamName}
              teamBadge={champion.teamBadge}
              teamId={champion.teamId}
            />
          ) : (
            <div className="flex flex-col gap-4">
              <RoundSelector
                rounds={allRounds}
                currentRound={roundFilter}
                extraParams={{ tab }}
                basePath={`/leagues/${slug}`}
              />
              <MatchHistory
                matches={matches}
                groupByRound={roundFilter == null}
                emptyMessage={
                  tab === 'results'
                    ? 'No results — API key required.'
                    : 'No upcoming matches — API key required.'
                }
              />
            </div>
          )
        )}
```

- [ ] **Step 8: Verify**

Run: `npm run lint`
Expected: passes. Then `npm run build` (web) — expected: compiles. `champion` is `null` on non-fixtures tabs, so other tabs are unaffected.

- [ ] **Step 9: Commit (only if user authorized)**

```bash
git add "apps/web/src/app/leagues/[slug]/page.tsx"
git commit -m "feat(web): show champion card on finished-season fixtures tab; translate league page to English"
```

---

## Task 3: Translate team-tabs.tsx

**Files:**
- Modify: `apps/web/src/components/teams/team-tabs.tsx`

- [ ] **Step 1: Position labels** — change the `POSITION_LABEL` map values:

```tsx
const POSITION_LABEL: Record<string, string> = {
  Goalkeeper: 'Goalkeepers',
  Defender: 'Defenders',
  Midfielder: 'Midfielders',
  Forward: 'Forwards',
};
```

- [ ] **Step 2: UnavailableCard** — `Données temporairement indisponibles` → `Temporarily unavailable`; `Ces informations seront disponibles dans quelques instants.` → `This information will be available shortly.`

- [ ] **Step 3: RateLimitCard** — `Limite de requêtes atteinte` → `Rate limit reached`; the `L&apos;API autorise 10 requêtes par minute. Patientez quelques secondes puis rechargez la page.` line → `The API allows 10 requests per minute. Wait a few seconds, then reload the page.`

- [ ] **Step 4: SeasonOverCard** — change the date formatter locale `'fr-FR'` → `'en-GB'`; `Saison terminée` → `Season over`; the conditional line → `` {endLabel ? `The season ended on ${endLabel}.` : 'The season is over.'} ``; `Les matchs reprendront la saison prochaine.` → `Matches resume next season.`

- [ ] **Step 5: Squad/Matches sections** — `Blessés` → `Injured`; `Résultats` (GroupHeading) → `Results`; `Prochains matchs` → `Upcoming matches`; `emptyMessage="Aucune rencontre à venir."` → `emptyMessage="No upcoming matches."`; `Aucun joueur disponible.` → `No players available.`

- [ ] **Step 6: Catch any remainder in this file**

Run: `grep -nIE "[éèêàâùûôîçÉÈÀ]" apps/web/src/components/teams/team-tabs.tsx`
Expected: no matches (data-only files have none here). Translate anything left using the dictionary.

- [ ] **Step 7: Verify** — `npm run lint` passes.

- [ ] **Step 8: Commit (only if user authorized)**

```bash
git add apps/web/src/components/teams/team-tabs.tsx
git commit -m "i18n(web): translate team tabs to English"
```

---

## Task 4: Translate player + team hero cards and player page

**Files:**
- Modify: `apps/web/src/components/player/player-hero-card.tsx`
- Modify: `apps/web/src/components/teams/team-hero-card.tsx`
- Modify: `apps/web/src/app/players/[playerId]/page.tsx`
- Modify: `apps/web/src/components/player/trophies-section.tsx`

- [ ] **Step 1: Stat labels** — across these files replace stat-item labels: `'Numéro'` → `'Number'`, `'Nationalité'` → `'Nationality'`, `'Contrat début'` → `'Contract start'`, `'Fondé en'` → `'Founded'`, `'Encaissés / M'` → `'Conceded / M'`. Replace the penalties suffix `` ` · ${s.penalties} pén.` `` → `` ` · ${s.penalties} pen.` ``.

- [ ] **Step 2: Section headings** — `Matchs récents` → `Recent matches`; `Palmarès ({trophies.length})` → `Trophies ({trophies.length})`.

- [ ] **Step 3: trophies-section.tsx** — `Aucun palmarès trouvé.` → `No trophies found.`

- [ ] **Step 4: Catch remainder**

Run: `grep -nIE "[éèêàâùûôîçÉÈÀ]" apps/web/src/components/player/player-hero-card.tsx apps/web/src/components/teams/team-hero-card.tsx "apps/web/src/app/players/[playerId]/page.tsx" apps/web/src/components/player/trophies-section.tsx`
Expected: only proper-noun **data** (none expected in these files). Translate any UI string left.

- [ ] **Step 5: Verify** — `npm run lint` passes.

- [ ] **Step 6: Commit (only if user authorized)**

```bash
git add apps/web/src/components/player/player-hero-card.tsx apps/web/src/components/teams/team-hero-card.tsx "apps/web/src/app/players/[playerId]/page.tsx" apps/web/src/components/player/trophies-section.tsx
git commit -m "i18n(web): translate player/team hero cards and trophies to English"
```

---

## Task 5: Translate remaining components + final sweep

**Files:**
- Modify: `apps/web/src/components/scorers/scorers-board.tsx`
- Modify: `apps/web/src/components/feed/round-selector.tsx`
- Modify: `apps/web/src/components/feed/live-feed.tsx`
- Modify: `apps/web/src/components/matches/match-history.tsx`

- [ ] **Step 1: scorers-board.tsx** — `Le classement des buteurs de {league.name} apparaîtra dès les premiers buts de la saison.` → `The {league.name} scorers ranking will appear after the season's first goals.`

- [ ] **Step 2: round-selector.tsx** — `Journée` → `Matchday`.

- [ ] **Step 3: live-feed.tsx** — `aria-label="Match précédent"` → `aria-label="Previous match"` (and translate any paired "next match" aria-label to `Next match`).

- [ ] **Step 4: match-history.tsx** — translate any French (e.g. group heading `Résultats` → `Results`, `Journée` → `Matchday`); default `emptyMessage` is already English (`'No matches found.'`).

- [ ] **Step 5: Whole-app final sweep**

Run:
```bash
grep -rnIE "[éèêàâùûôîçÉÈÀ]" apps/web/src --include="*.tsx" --include="*.ts" \
  | grep -vE "Diabaté|Doucouré|Baldé|Sidibé|Pétrot|Rémy|Descamps|Defourny|Zidane|Hantz|Frédéric|Cheick|Moussa|Mama|Loïc|Léo|Théo"
```
Expected: **no UI strings** — only mock/sample player-name **data** (the excluded names) if any remain. Translate every UI string still showing, using the dictionary. Re-run until clean.

- [ ] **Step 6: Verify build**

Run: `npm run lint && npm run build`
Expected: both pass.

- [ ] **Step 7: Commit (only if user authorized)**

```bash
git add apps/web/src/components/scorers/scorers-board.tsx apps/web/src/components/feed/round-selector.tsx apps/web/src/components/feed/live-feed.tsx apps/web/src/components/matches/match-history.tsx
git commit -m "i18n(web): translate remaining components to English"
```

---

## Task 6: Manual verification

- [ ] **Step 1: Run the app**

Run: `npm run dev:front` (or `npm run dev` for both).

- [ ] **Step 2: Champion card** — open a finished-season league's `fixtures` tab (e.g. a 2024/25 league where the backend `season.finished` is true). Expected: gold ChampionCard with trophy, winner badge, name, `Champions {season}`. Clicking it navigates to `/teams/{id}` when a teamId resolved.

- [ ] **Step 3: In-season fallback** — open an in-progress league's `fixtures` tab. Expected: normal RoundSelector + fixtures list (or `No upcoming matches — API key required.` if empty).

- [ ] **Step 4: Language** — click through league tabs (Standings/Scorers/Results/Fixtures), a team page (squad positions, Injured, Upcoming/Recent matches, Season over card), a player page (Number/Nationality/Contract start/Trophies), scorers board empty state. Expected: zero French visible.

- [ ] **Step 5: Final grep gate** — re-run the Task 5 Step 5 grep. Expected: clean (data names only).

---

## Self-review notes

- **Spec coverage:** champion card (Task 1–2), language sweep across all inventoried files (Tasks 2–5), manual testing (Task 6). All spec sections mapped.
- **`ApiSeason`:** already exists in `api-types.ts` (`startDate`/`endDate` typed as `string`), so no api-types task is needed — Task 2 only imports it.
- **Type consistency:** `champion` shape `{ teamName, teamBadge, teamId? }` matches `ChampionCardProps` (`teamId?: string`); `teamBadge: string | null` matches.
