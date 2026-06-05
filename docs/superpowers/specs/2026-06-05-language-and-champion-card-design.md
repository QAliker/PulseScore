# Spec 1 — English Language Sweep + Champion Card

**Date:** 2026-06-05
**Status:** Approved (design)
**Scope:** `apps/web` (frontend). No DB/API schema changes — reuses existing backend `getSeason` endpoint.

> Part of a 2-spec split. Spec 2 (World Cup full tournament: group tables + knockout bracket + national teams) is a separate design cycle and is **out of scope here**.

---

## Goal

Two cohesive frontend changes shipped in one pass:

1. **Champion card** — when a league season is finished, the `fixtures` tab shows a polished champion card instead of the "no upcoming matches — API key required" empty state.
2. **Language sweep** — the entire site UI is English-only. Remove all mixed French strings. Player/team proper names are data and remain untouched.

---

## Part A — Champion Card

### Trigger & data flow

- The leagues page (`apps/web/src/app/leagues/[slug]/page.tsx`) already fetches `standings`, `results`, `fixtures`, `scorers` per active tab.
- Add a parallel fetch of the **season** for the `fixtures` tab: `GET /leagues/{leagueId}/season` → `ApiSeason`.
- Backend already exposes this via `StandingsService.getSeason` → `SeasonDto`:
  ```ts
  { leagueId, startDate, endDate, currentMatchday, finished, winnerName }
  ```
- Render logic for the `fixtures` tab:
  - If `season.finished === true` **and** a champion can be resolved → render `<ChampionCard>`.
  - Else → existing `RoundSelector` + `MatchHistory` (with translated empty message).

### Resolving the champion

- Primary: `season.winnerName` (from Football-Data.org).
- Badge/logo: match `winnerName` against the standings list to grab `teamBadge` and `teamId` (link target). Fetch standings alongside on the fixtures tab for this.
- Fallback: if `winnerName` is null but `season.finished` and standings exist → use `standings[0]` (rank 1) as champion.
- If neither resolves → fall back to the existing empty state (translated).

### Component

`apps/web/src/components/leagues/champion-card.tsx` (new)

- Props: `{ league, teamName, teamBadge, teamId?, season }`.
- Content: trophy icon (lucide `Trophy`), team badge, team name, `"Champions {league.season}"`, league name subtitle, gold/amber accent treatment.
- Crafted with the `/impeccable` skill during implementation for distinctive, non-generic visual quality.
- If `teamId` present, the card links to `/teams/{teamId}`.

### API types

`apps/web/src/lib/api-types.ts`:
```ts
export type ApiSeason = {
  leagueId: string;
  startDate: string | null;
  endDate: string | null;
  currentMatchday: number | null;
  finished: boolean;
  winnerName: string | null;
};
```
Add the `getSeason` fetch call where the other `apiFetch` calls live in the leagues page.

---

## Part B — Language Sweep (English-only)

Replace every user-facing French UI string with English. No i18n framework — the site is English-only, so direct string replacement.

### Inventory (translate these)

| Location | French | English |
|---|---|---|
| `leagues/[slug]/page.tsx` tabs | Classement | Standings |
| | Buteurs | Scorers |
| | Résultats | Results |
| | Fixtures | Fixtures (keep) |
| `leagues/[slug]/page.tsx` nav | Toutes les ligues | All leagues |
| | Classement indisponible — clé API requise. | Standings unavailable — API key required. |
| | Aucun résultat — clé API requise. | No results — API key required. |
| | Aucun match à venir — clé API requise. | No upcoming matches — API key required. |
| `components/teams/team-tabs.tsx` | Les matchs reprendront la saison prochaine. | Matches resume next season. |
| | Aucun joueur disponible. | No players available. |
| | Aucune rencontre à venir. | No upcoming matches. |
| | Aucun match disponible. | No matches available. |
| | Aucune information disponible. | No information available. |
| | Défenseur / Défenseurs | Defender / Defenders |
| | Fondé en | Founded |
| | Nationalité | Nationality |
| | Numéro | Number |
| | Contrat début | Contract start |
| | Encaissés / M | Conceded / M |
| `components/scorers/scorers-board.tsx` | Le classement des buteurs de {league.name} apparaîtra dès les premiers buts de la saison. | The {league.name} scorers ranking will appear after the season's first goals. |
| `components/player/trophies-section.tsx` | Aucun palmarès trouvé. | No trophies found. |
| `components/matches/*` | Match précédent | Previous match |
| | Aucune rencontre à venir. | No upcoming matches. |
| | `est achevé le ${endLabel}` | `ended on ${endLabel}` |

> The table is the known inventory at spec time. During implementation, run a final French-character grep (`[éèêàâùûôîç]` over `apps/web/src`, excluding proper-noun data) to catch any string missed here, and translate those too. Other position labels surfacing near `Défenseur` (e.g. Gardien→Goalkeeper, Milieu→Midfielder, Attaquant→Forward) must be translated consistently if present.

### Not translated

- Player names, team names, coach names, venue names, country names returned from APIs — these are data.
- Locale of date formatting: keep as-is unless it surfaces French month/day words; if it does, switch the formatter locale to `en-GB`.

---

## Out of scope

- World Cup (Spec 2).
- No i18n/localization framework, no language switcher.
- No backend schema changes.

---

## Testing

- `npm run lint` clean.
- Manual: run the app (`npm run dev:front` or `npm run dev`), open a league `fixtures` tab whose season is finished → champion card renders with badge + name. Open an in-season league → fixtures list renders.
- Manual French scan: grep `apps/web/src` for French accented characters; only proper-noun data remains.
- Spot-check team page, scorers board, player trophies for English.

## Files touched

- `apps/web/src/app/leagues/[slug]/page.tsx` (champion fetch + render, tab/nav strings)
- `apps/web/src/components/leagues/champion-card.tsx` (new)
- `apps/web/src/components/teams/team-tabs.tsx`
- `apps/web/src/components/scorers/scorers-board.tsx`
- `apps/web/src/components/player/trophies-section.tsx`
- `apps/web/src/components/matches/*` (match-history / match cards)
- `apps/web/src/lib/api-types.ts`
- Any other file surfaced by the final French grep.
