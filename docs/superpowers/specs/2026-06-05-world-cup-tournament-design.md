# Spec 2 — World Cup Full Tournament

**Date:** 2026-06-05
**Status:** Approved (design)
**Scope:** `apps/api` (NestJS) + `apps/web` (Next.js). Adds the FIFA World Cup as a tournament with group tables, a visual knockout bracket, scorers, and results.

> Companion to Spec 1 (language sweep + champion card), which is complete.

---

## Goal

Add the FIFA World Cup to PulseScore as a first-class competition with a dedicated view: **Groups · Bracket · Scorers · Results**. Group stage shows the 8 group tables; knockout shows a visual bracket tree (R16 → QF → SF → Final, plus third-place playoff).

## Decisions (locked)

- **Data source:** Football-Data.org, competition code `WC`. Reuses the existing current-season FDO path (`getCurrentSeason() >= 2025 → FDO`). WC is on the FDO free tier and exposes `group` (standings) and `stage`/`group` (matches).
- **Tabs:** Groups · Bracket · Scorers · Results.
- **Bracket style:** Visual bracket tree with connector lines (responsive: horizontal scroll / stacked on small screens).

---

## Architecture

The World Cup is identified by a flag on the web `League` model (`isCup: true`) with `apiFootballId: 1`, `fdoCode: 'WC'`. The leagues `[slug]` page branches: standard leagues render the existing tabs; a cup renders the new `WorldCupView`.

No DB seeding required. Standings/teams resolve on the fly through existing FDO fetch + graceful fallback (`league.findFirst` → null falls back to raw id; `team.findFirst` → null badge). WC is **excluded from cron warmup** (`refreshStandings`, fixtures prewarm) and fetched on demand + cached, to protect API rate limits.

---

## Backend (`apps/api`)

### Interfaces — `interfaces/football-data-org.interfaces.ts`
- `FdoStandingsResponse.standings` element type: add `group?: string | null` (FDO sends e.g. `"GROUP_A"`).
- `FdoMatch`: add `stage?: string | null` and `group?: string | null`.

### DTOs
- `dto/standing.dto.ts`: add `group: string | null`.
- `dto/match.dto.ts`: add `stage: string | null` and `group: string | null`.

### Normalizers — `normalizer/football-data-org.normalizer.ts`
- `normalizeStanding(...)`: accept and set `group` (passed from service per group table).
- Match normalizer: set `dto.stage = raw.stage ?? null` and `dto.group = raw.group ?? null`.

### Service — `services/standings.service.ts`
- New method `getGroupStandings(leagueId)`: like `getStandingsFdo` but returns **every** `type === 'TOTAL'` group table (not just the first), each row labelled with its `group`. Cached under a new key (`groupsKey`).
- Existing `getStandings` / `getStandingsFdo` unchanged for normal leagues.
- `constants/season.constants.ts`: `LEAGUE_MAP['1'] = { fdoCode: 'WC', name: 'FIFA World Cup' }`.

### Controller — `controllers/leagues.controller.ts`
- New route `GET :leagueId/groups` → `StandingsService.getGroupStandings(leagueId)` → `StandingDto[]`.
- Existing `:leagueId/fixtures`, `:leagueId/results`, `:leagueId/scorers` reused as-is; they now carry `stage`/`group` via the normalizer change (frontend builds the bracket from these).

### Warmup
- Leave the `LEAGUE_IDS = ['39','140','78','135','61']` arrays in `fixtures.service.ts` / `standings.service.ts` unchanged (WC not added) so cron does not fetch WC.

---

## Frontend (`apps/web`)

### Config — `lib/leagues.ts`
- `League` type: add `isCup?: boolean`.
- New entry:
  ```ts
  {
    slug: 'fifa-world-cup',
    name: 'FIFA World Cup',
    country: 'World',
    countryCode: 'WORLD',
    logo: 'https://media.api-sports.io/football/leagues/1.png',
    isCup: true,
    apiFootballId: 1,
    fdoCode: 'WC',
    season: '2026',
  }
  ```
  (`countryCode`/flag handling: `LeagueLogo` already falls back to the league `logo`; verify no crash on an unknown flag code — if `countryCode` is used for a flag lookup, guard it.)

### Types — `lib/api-types.ts`
- `ApiStanding`: add `group: string | null`.
- `ApiMatch`: add `stage: string | null` and `group: string | null`.

### Components — `components/world-cup/`
- `world-cup-view.tsx` — tab shell (Groups · Bracket · Scorers · Results), mirrors the existing `[slug]` page tab nav/styling. Receives league + fetched data via props (page does the fetching) or fetches itself as a server component — match the existing page's data-fetching pattern.
- `group-standings.tsx` — renders the group tables: groups derived by grouping `ApiStanding[]` on `group`, sorted A→H; each group a compact standings table (reuse/adapt `StandingTable` styling). Responsive 1-col → 2-col grid.
- `knockout-bracket.tsx` — visual bracket tree built from `ApiMatch[]` filtered to knockout stages. Columns: Round of 16 → Quarter-finals → Semi-finals → Final (+ a separate Third-place card). Connector lines between rounds; team badge + name + score per match; unplayed matches show TBD/scheduled. Mobile: horizontal scroll or stacked-by-stage.
- Reuse `ScorersBoard` (Scorers) and `MatchHistory` (Results, grouped by `stage` label) — no new components needed there.
- Stage label mapping (raw FDO → display): `GROUP_STAGE`→`Group Stage`, `LAST_16`→`Round of 16`, `QUARTER_FINALS`→`Quarter-finals`, `SEMI_FINALS`→`Semi-finals`, `THIRD_PLACE`→`Third place`, `FINAL`→`Final`. Centralize in one helper in `components/world-cup/`.

### Page — `app/leagues/[slug]/page.tsx`
- After resolving `league`, if `league.isCup`, fetch WC data (`/groups`, `/fixtures`, `/results`, `/scorers`) and render `<WorldCupView league={league} ... />`; return early. Standard-league rendering path unchanged.

### Polish
- Build the bracket and group views with the `/impeccable` skill — the bracket is the showpiece.

---

## Edge cases & out of scope

- **Pre-tournament (current, ~6 days before kickoff):** groups/standings empty until games are played → show a "Group stage begins {date}" empty state; bracket renders TBD slots from scheduled fixtures (or a "Bracket set after the group stage" placeholder if knockout fixtures don't exist yet).
- **National-team pages:** clicking a team badge routes to `/teams/[teamId]`, which may be sparse (no squad/venue for national teams). **Out of scope** — known limitation; do not block on it. Acceptable to make WC badges non-links if simpler.
- No live in-match updates beyond existing behavior.
- No third-source enrichment (ESPN/RAF) for WC.

---

## Testing

- **API Jest** (`npm run test`, this path has a harness): unit tests for the FDO normalizer `stage`/`group` mapping and `getGroupStandings` returning multiple labelled group tables (mock FDO response with `GROUP_A`/`GROUP_B`).
- **Web:** `npm run lint` + `npm run build --workspace=apps/web` pass.
- **Manual:** open `/leagues/fifa-world-cup` → Groups tab shows 8 tables (or empty-state pre-tournament); Bracket renders; Scorers/Results populate; no console errors.

## Files touched

**API:** `interfaces/football-data-org.interfaces.ts`, `dto/standing.dto.ts`, `dto/match.dto.ts`, `normalizer/football-data-org.normalizer.ts`, `services/standings.service.ts`, `constants/season.constants.ts`, `controllers/leagues.controller.ts` (+ new normalizer/service Jest specs).

**Web:** `lib/leagues.ts`, `lib/api-types.ts`, `app/leagues/[slug]/page.tsx`, new `components/world-cup/world-cup-view.tsx`, `components/world-cup/group-standings.tsx`, `components/world-cup/knockout-bracket.tsx`, `components/world-cup/stage-labels.ts` (helper).
