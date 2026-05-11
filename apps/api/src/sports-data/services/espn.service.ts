import { Injectable, Logger } from '@nestjs/common';
import { EspnClient } from '../client/espn.client';
import {
  SportsDataCacheService,
  TTL_LINEUPS,
} from '../sports-data-cache.service';
import {
  LineupPlayerDto,
  MatchLineupsDto,
  TeamLineupDto,
} from '../dto/match.dto';

// RAF and FDO league IDs → ESPN slug
const ESPN_SLUG: Record<string, string> = {
  '39': 'eng.1',
  '140': 'esp.1',
  '78': 'ger.1',
  '135': 'ita.1',
  '61': 'fra.1',
  'fdo:PL': 'eng.1',
  'fdo:PD': 'esp.1',
  'fdo:BL1': 'ger.1',
  'fdo:SA': 'ita.1',
  'fdo:FL1': 'fra.1',
};

// Normalised names that fuzzy token overlap fails on
const NAME_ALIASES: Record<string, string> = {
  internazionale: 'inter',
  'inter milan': 'inter',
  'ac milan': 'milan',
  'borussia dortmund': 'dortmund',
  'borussia monchengladbach': 'gladbach',
  monchengladbach: 'gladbach',
  'bayer leverkusen': 'leverkusen',
  'atletico madrid': 'atletico',
  'real madrid': 'madrid',
  'paris saint germain': 'psg',
};

// ── ESPN raw types ────────────────────────────────────────────────────────────

interface EspnAthlete {
  id: string;
  displayName: string;
  position?: { abbreviation: string };
}

interface EspnRosterEntry {
  athlete: EspnAthlete;
  starter: boolean;
  active: boolean;
  jersey?: string;
  formationPlace?: number | string;
  position?: { abbreviation: string };
}

interface EspnTeamRoster {
  team: { id: string; displayName: string; shortDisplayName: string };
  formation?: string;
  roster: EspnRosterEntry[];
}

interface EspnSummaryResponse {
  rosters?: EspnTeamRoster[];
  header?: {
    competitions?: Array<{
      competitors: Array<{
        homeAway: 'home' | 'away';
        team: { id: string; displayName: string; shortDisplayName: string };
      }>;
    }>;
  };
}

interface EspnScoreboardEvent {
  id: string;
  competitions: Array<{
    competitors: Array<{
      homeAway: 'home' | 'away';
      team: { displayName: string; shortDisplayName: string };
    }>;
  }>;
}

interface EspnScoreboardResponse {
  events?: EspnScoreboardEvent[];
}

// ─────────────────────────────────────────────────────────────────────────────

@Injectable()
export class EspnService {
  private readonly logger = new Logger(EspnService.name);

  constructor(
    private readonly espnClient: EspnClient,
    private readonly cacheService: SportsDataCacheService,
  ) {}

  async getLineups(
    matchId: string,
    leagueId: string,
    homeTeamName: string,
    awayTeamName: string,
    matchDate: Date | string,
  ): Promise<MatchLineupsDto | null> {
    const cacheKey = SportsDataCacheService.lineupsKey(matchId);
    const cached = await this.cacheService.getCached<MatchLineupsDto>(cacheKey);
    if (cached) return cached;

    const slug = ESPN_SLUG[leagueId];
    if (!slug) return null;

    const dateStr = new Date(matchDate)
      .toISOString()
      .slice(0, 10)
      .replace(/-/g, '');

    try {
      const espnEventId = await this.findEspnEvent(
        slug,
        homeTeamName,
        awayTeamName,
        dateStr,
      );
      if (!espnEventId) {
        this.logger.warn(
          `No ESPN match found: ${homeTeamName} vs ${awayTeamName} on ${dateStr}`,
        );
        return null;
      }

      const summary = await this.espnClient.get<EspnSummaryResponse>(
        `${slug}/summary`,
        { event: espnEventId },
      );

      if (!summary.rosters || summary.rosters.length < 2) return null;

      const homeRoster = this.resolveRoster(summary, homeTeamName, 'home');
      const awayRoster = this.resolveRoster(summary, awayTeamName, 'away');
      if (!homeRoster || !awayRoster) return null;

      const lineups: MatchLineupsDto = {
        home: this.buildTeamLineup(homeRoster),
        away: this.buildTeamLineup(awayRoster),
      };

      await this.cacheService.setCached(cacheKey, lineups, TTL_LINEUPS);
      return lineups;
    } catch (err) {
      this.logger.error(
        `ESPN lineup fetch failed [${matchId}]: ${String(err)}`,
      );
      return null;
    }
  }

  // ── Private helpers ─────────────────────────────────────────────────────────

  private async findEspnEvent(
    slug: string,
    homeTeam: string,
    awayTeam: string,
    dateStr: string,
  ): Promise<string | null> {
    const board = await this.espnClient.get<EspnScoreboardResponse>(
      `${slug}/scoreboard`,
      { dates: dateStr },
    );
    if (!board.events?.length) return null;

    let bestId: string | null = null;
    let bestScore = 0;

    for (const event of board.events) {
      const comp = event.competitions?.[0];
      if (!comp) continue;

      const home = comp.competitors.find((c) => c.homeAway === 'home');
      const away = comp.competitors.find((c) => c.homeAway === 'away');
      if (!home || !away) continue;

      const hScore = Math.max(
        this.similarity(homeTeam, home.team.displayName),
        this.similarity(homeTeam, home.team.shortDisplayName),
      );
      const aScore = Math.max(
        this.similarity(awayTeam, away.team.displayName),
        this.similarity(awayTeam, away.team.shortDisplayName),
      );
      const score = (hScore + aScore) / 2;

      if (score > bestScore) {
        bestScore = score;
        bestId = event.id;
      }
    }

    return bestScore >= 0.5 ? bestId : null;
  }

  private resolveRoster(
    summary: EspnSummaryResponse,
    teamName: string,
    side: 'home' | 'away',
  ): EspnTeamRoster | null {
    // Prefer ID match from header
    const comp = summary.header?.competitions?.[0];
    if (comp) {
      const competitor = comp.competitors.find((c) => c.homeAway === side);
      if (competitor) {
        const found = summary.rosters?.find(
          (r) => r.team.id === competitor.team.id,
        );
        if (found) return found;
      }
    }

    // Fallback: best name similarity
    let best: EspnTeamRoster | null = null;
    let bestScore = 0;
    for (const roster of summary.rosters ?? []) {
      const score = Math.max(
        this.similarity(teamName, roster.team.displayName),
        this.similarity(teamName, roster.team.shortDisplayName),
      );
      if (score > bestScore) {
        bestScore = score;
        best = roster;
      }
    }
    return best;
  }

  private buildTeamLineup(roster: EspnTeamRoster): TeamLineupDto {
    const formation = roster.formation ?? '';
    const active = roster.roster.filter((e) => e.active);
    const starters = active.filter((e) => e.starter);
    const bench = active.filter((e) => !e.starter);

    const dto = new TeamLineupDto();
    dto.formation = formation;
    dto.coach = '';
    dto.starting = starters.map((e) => this.buildPlayer(e, formation));
    dto.bench = bench.map((e) => this.buildPlayer(e, ''));
    return dto;
  }

  private buildPlayer(
    entry: EspnRosterEntry,
    formation: string,
  ): LineupPlayerDto {
    const { id } = entry.athlete;
    const { row, col } = this.computePosition(
      Number(entry.formationPlace),
      formation,
    );

    const dto = new LineupPlayerDto();
    dto.id = id;
    dto.name = entry.athlete.displayName;
    dto.number = parseInt(entry.jersey ?? '0', 10) || 0;
    dto.positionRow = row;
    dto.positionCol = col;
    dto.positionLabel =
      entry.athlete.position?.abbreviation ??
      entry.position?.abbreviation ??
      '';
    dto.photo = `https://a.espncdn.com/i/headshots/soccer/players/full/${id}.png`;
    return dto;
  }

  private computePosition(
    formationPlace: number | undefined,
    formation: string,
  ): { row: number; col: number } {
    if (!formationPlace || !formation) return { row: 0, col: 0 };
    if (formationPlace === 1) return { row: 0, col: 0 }; // GK

    const groups = formation
      .split('-')
      .map(Number)
      .filter((n) => !isNaN(n) && n > 0);
    if (!groups.length) return { row: 0, col: 0 };

    let pos = 2;
    for (let i = 0; i < groups.length; i++) {
      const count = groups[i];
      if (formationPlace >= pos && formationPlace < pos + count) {
        return { row: i + 1, col: formationPlace - pos };
      }
      pos += count;
    }
    return { row: 0, col: 0 };
  }

  private normalize(name: string): string {
    const n = name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(
        /\b(fc|afc|sc|cf|rc|ac|as|us|ss|bsc|fsv|sv|vfb|rb|bv|tsv|vfl|1\.)\b/g,
        '',
      )
      .replace(/\butd\b/g, 'united')
      .replace(/\bman\b/g, 'manchester')
      .replace(/[^a-z0-9 ]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    return NAME_ALIASES[n] ?? n;
  }

  private similarity(a: string, b: string): number {
    const na = this.normalize(a);
    const nb = this.normalize(b);
    if (na === nb) return 1;
    const ta = new Set(na.split(' ').filter(Boolean));
    const tb = new Set(nb.split(' ').filter(Boolean));
    const intersection = [...ta].filter((t) => tb.has(t)).length;
    const union = new Set([...ta, ...tb]).size;
    return union === 0 ? 0 : intersection / union;
  }
}
