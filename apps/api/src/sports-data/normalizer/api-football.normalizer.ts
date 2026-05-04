import { Injectable } from '@nestjs/common';
import {
  RafFixture,
  RafStandingEntry,
  RafPlayerResponse,
  RafFixtureLineup,
} from '../interfaces/api-football.interfaces';
import {
  MatchDto,
  GoalscorerDto,
  CardDto,
  SubstitutionDto,
  LineupPlayerDto,
  TeamLineupDto,
  MatchLineupsDto,
  StatisticDto,
} from '../dto/match.dto';
import { TeamDto } from '../dto/team.dto';
import { LeagueDto } from '../dto/league.dto';
import { StandingDto } from '../dto/standing.dto';
import { PlayerDto } from '../dto/player.dto';

@Injectable()
export class ApiFootballNormalizer {
  normalizeStatus(short: string): MatchDto['status'] {
    switch (short) {
      case 'FT':
      case 'AET':
      case 'PEN':
        return 'FINISHED';
      case '1H':
      case 'HT':
      case '2H':
      case 'ET':
      case 'BT':
      case 'P':
      case 'SUSP':
      case 'INT':
      case 'LIVE':
        return 'LIVE';
      case 'PST':
        return 'POSTPONED';
      case 'CANC':
      case 'ABD':
      case 'AWD':
      case 'WO':
        return 'CANCELLED';
      default:
        return 'SCHEDULED';
    }
  }

  parseRound(round: string): number | null {
    if (!round) return null;
    const m = round.match(/(\d+)/);
    return m ? parseInt(m[1], 10) : null;
  }

  normalizeFixture(raw: RafFixture): MatchDto {
    const dto = new MatchDto();

    dto.id = String(raw.fixture.id);
    dto.externalId = String(raw.fixture.id);

    const homeTeam = new TeamDto();
    homeTeam.id = String(raw.teams.home.id);
    homeTeam.externalId = String(raw.teams.home.id);
    homeTeam.name = raw.teams.home.name;
    homeTeam.logo = raw.teams.home.logo || null;
    dto.homeTeam = homeTeam;

    const awayTeam = new TeamDto();
    awayTeam.id = String(raw.teams.away.id);
    awayTeam.externalId = String(raw.teams.away.id);
    awayTeam.name = raw.teams.away.name;
    awayTeam.logo = raw.teams.away.logo || null;
    dto.awayTeam = awayTeam;

    dto.homeScore = raw.goals.home;
    dto.awayScore = raw.goals.away;
    dto.status = this.normalizeStatus(raw.fixture.status.short);
    dto.sport = 'Football';
    dto.progress = raw.fixture.status.elapsed
      ? `${raw.fixture.status.elapsed}'`
      : (raw.fixture.status.short ?? null);
    dto.venue = raw.fixture.venue.name ?? null;
    dto.round = this.parseRound(raw.league.round);
    dto.startTime = new Date(raw.fixture.date);

    const league = new LeagueDto();
    league.id = String(raw.league.id);
    league.externalId = String(raw.league.id);
    league.name = raw.league.name;
    league.sport = 'Football';
    league.country = raw.league.country || null;
    league.logo = raw.league.logo || null;
    dto.league = league;

    const events = raw.events ?? [];

    dto.goalscorers = events
      .filter((e) => e.type === 'Goal')
      .map((e) => {
        const gs = new GoalscorerDto();
        gs.time = String(e.time.elapsed);
        const isHome = e.team.id === raw.teams.home.id;
        gs.homeScorer = isHome ? (e.player.name ?? null) : null;
        gs.awayScorer = !isHome ? (e.player.name ?? null) : null;
        gs.score = '';
        gs.info = e.detail || null;
        return gs;
      });

    dto.cards = events
      .filter((e) => e.type === 'Card')
      .map((e) => {
        const card = new CardDto();
        card.time = String(e.time.elapsed);
        const isHome = e.team.id === raw.teams.home.id;
        card.homeFault = isHome ? (e.player.name ?? null) : null;
        card.awayFault = !isHome ? (e.player.name ?? null) : null;
        card.card = e.detail;
        card.info = e.comments || null;
        return card;
      });

    dto.substitutions = events
      .filter((e) => e.type === 'subst')
      .map((e) => {
        const sub = new SubstitutionDto();
        sub.time = String(e.time.elapsed);
        sub.team = e.team.id === raw.teams.home.id ? 'home' : 'away';
        sub.playerIn = e.player.name ?? null;
        sub.playerOut = e.assist.name ?? null;
        return sub;
      });

    if (raw.lineups?.length >= 2) {
      const lineups = new MatchLineupsDto();
      lineups.home = this.normalizeLineup(raw.lineups[0]);
      lineups.away = this.normalizeLineup(raw.lineups[1]);
      dto.lineups = lineups;
    } else {
      dto.lineups = null;
    }

    dto.statistics = this.normalizeStatistics(raw);

    return dto;
  }

  /** Alias kept for callers that haven't been updated yet */
  normalizeMatch(raw: RafFixture): MatchDto {
    return this.normalizeFixture(raw);
  }

  private normalizeLineup(raw: RafFixtureLineup): TeamLineupDto {
    const dto = new TeamLineupDto();
    dto.formation = raw.formation || '';
    dto.coach = raw.coach?.name || '';

    dto.starting = (raw.startXI ?? []).map((entry, i) => {
      const p = entry.player;
      const player = new LineupPlayerDto();
      player.id = String(p.id);
      player.name = p.name;
      player.number = p.number;
      player.positionLabel = p.pos || '';
      player.photo = null;

      // grid format is "row:col" (e.g. "1:1")
      if (p.grid) {
        const [row, col] = p.grid.split(':').map((n) => parseInt(n, 10));
        player.positionRow = isNaN(row) ? i : row;
        player.positionCol = isNaN(col) ? 0 : col - 1;
      } else {
        player.positionRow = i;
        player.positionCol = 0;
      }
      return player;
    });

    dto.bench = (raw.substitutes ?? []).map((entry, i) => {
      const p = entry.player;
      const player = new LineupPlayerDto();
      player.id = String(p.id);
      player.name = p.name;
      player.number = p.number;
      player.positionRow = 0;
      player.positionCol = i;
      player.positionLabel = 'SUB';
      player.photo = null;
      return player;
    });

    return dto;
  }

  private normalizeStatistics(raw: RafFixture): StatisticDto[] {
    if (!raw.statistics?.length) return [];

    const homeStats = raw.statistics.find(
      (s) => s.team.id === raw.teams.home.id,
    );
    const awayStats = raw.statistics.find(
      (s) => s.team.id === raw.teams.away.id,
    );
    if (!homeStats || !awayStats) return [];

    const awayMap = new Map(
      awayStats.statistics.map((s) => [s.type, s.value]),
    );

    return homeStats.statistics.map((hs) => {
      const stat = new StatisticDto();
      stat.type = hs.type;
      stat.home = hs.value != null ? String(hs.value) : '0';
      const awayVal = awayMap.get(hs.type);
      stat.away = awayVal != null ? String(awayVal) : '0';
      return stat;
    });
  }

  normalizeStanding(
    entry: RafStandingEntry,
    leagueId: string,
    leagueName: string,
  ): StandingDto {
    const dto = new StandingDto();
    dto.leagueId = leagueId;
    dto.leagueName = leagueName;
    dto.teamId = String(entry.team.id);
    dto.teamName = entry.team.name;
    dto.teamBadge = entry.team.logo || null;
    dto.position = entry.rank;
    dto.played = entry.all.played;
    dto.won = entry.all.win;
    dto.drawn = entry.all.draw;
    dto.lost = entry.all.lose;
    dto.goalsFor = entry.all.goals.for;
    dto.goalsAgainst = entry.all.goals.against;
    dto.points = entry.points;
    dto.promotion = entry.description || null;
    return dto;
  }

  normalizePlayer(raw: RafPlayerResponse): PlayerDto {
    const dto = new PlayerDto();
    const stats = raw.statistics?.[0];

    dto.externalId = String(raw.player.id);
    dto.name = raw.player.name;
    dto.image = raw.player.photo || null;
    dto.number = stats?.games.number ?? null;
    dto.position = stats?.games.position ?? null;
    dto.age = raw.player.age ?? null;
    dto.teamId = stats ? String(stats.team.id) : null;
    dto.goals = stats?.goals.total ?? 0;
    dto.assists = stats?.goals.assists ?? 0;
    dto.yellowCards = stats?.cards.yellow ?? 0;
    dto.redCards = stats?.cards.red ?? 0;
    dto.matchesPlayed = stats?.games.appearences ?? 0;
    dto.rating = stats?.games.rating ?? null;
    return dto;
  }
}
