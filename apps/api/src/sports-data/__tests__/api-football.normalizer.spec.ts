import { ApiFootballNormalizer } from '../normalizer/api-football.normalizer';
import { AfMatch, AfStanding, AfPlayer } from '../interfaces/api-football.interfaces';

describe('ApiFootballNormalizer', () => {
  let normalizer: ApiFootballNormalizer;

  beforeEach(() => {
    normalizer = new ApiFootballNormalizer();
  });

  describe('normalizeStatus', () => {
    it('should return LIVE for a minute string like "45"', () => {
      expect(normalizer.normalizeStatus('45')).toBe('LIVE');
    });

    it('should return LIVE for "Half Time"', () => {
      expect(normalizer.normalizeStatus('Half Time')).toBe('LIVE');
    });

    it('should return FINISHED for "Finished"', () => {
      expect(normalizer.normalizeStatus('Finished')).toBe('FINISHED');
    });

    it('should return FINISHED for "After ET"', () => {
      expect(normalizer.normalizeStatus('After ET')).toBe('FINISHED');
    });

    it('should return FINISHED for "After Pen."', () => {
      expect(normalizer.normalizeStatus('After Pen.')).toBe('FINISHED');
    });

    it('should return POSTPONED for "Postponed"', () => {
      expect(normalizer.normalizeStatus('Postponed')).toBe('POSTPONED');
    });

    it('should return CANCELLED for "Cancelled"', () => {
      expect(normalizer.normalizeStatus('Cancelled')).toBe('CANCELLED');
    });

    it('should return CANCELLED for "Awarded"', () => {
      expect(normalizer.normalizeStatus('Awarded')).toBe('CANCELLED');
    });

    it('should return SCHEDULED for empty string', () => {
      expect(normalizer.normalizeStatus('')).toBe('SCHEDULED');
    });

    it('should return SCHEDULED for unknown status', () => {
      expect(normalizer.normalizeStatus('???')).toBe('SCHEDULED');
    });
  });

  describe('normalizeMatch', () => {
    const mockMatch: AfMatch = {
      match_id: '292061',
      country_id: '44',
      country_name: 'England',
      league_id: '152',
      league_name: 'Championship',
      match_date: '2026-04-10',
      match_status: 'Finished',
      match_time: '20:45',
      match_hometeam_id: '2627',
      match_hometeam_name: 'Leeds United',
      match_hometeam_score: '2',
      match_awayteam_id: '2637',
      match_awayteam_name: 'Sheffield Wednesday',
      match_awayteam_score: '1',
      match_hometeam_halftime_score: '1',
      match_awayteam_halftime_score: '0',
      match_hometeam_extra_score: '',
      match_awayteam_extra_score: '',
      match_hometeam_penalty_score: '',
      match_awayteam_penalty_score: '',
      match_hometeam_ft_score: '2',
      match_awayteam_ft_score: '1',
      match_hometeam_system: '4-3-3',
      match_awayteam_system: '4-4-2',
      match_live: '0',
      match_round: 'Round 38',
      match_stadium: 'Elland Road',
      match_referee: 'M. Oliver',
      team_home_badge: 'https://apiv3.apifootball.com/badges/2627.png',
      team_away_badge: 'https://apiv3.apifootball.com/badges/2637.png',
      league_logo: 'https://apiv3.apifootball.com/badges/logo_leagues/152.png',
      country_logo: 'https://apiv3.apifootball.com/badges/logo_country/44.png',
      league_year: '2025/2026',
      fk_stage_key: '1',
      stage_name: 'Current',
      goalscorer: [
        {
          time: '23',
          home_scorer: 'P. Bamford',
          home_scorer_id: '1234',
          home_assist: 'R. James',
          home_assist_id: '1235',
          score: '1 - 0',
          away_scorer: '',
          away_scorer_id: '',
          away_assist: '',
          away_assist_id: '',
          info: '',
          score_info_time: '1H',
        },
      ],
      cards: [
        {
          time: '55',
          home_fault: 'K. Phillips',
          card: 'yellow card',
          away_fault: '',
          info: '',
          home_player_id: '1236',
          away_player_id: '',
          score_info_time: '2H',
        },
      ],
      substitutions: { home: [], away: [] },
      lineup: { home: { starting_lineups: [], substitutes: [], coach: [], missing_players: [] }, away: { starting_lineups: [], substitutes: [], coach: [], missing_players: [] } },
      statistics: [],
      statistics_1half: [],
    };

    it('should map externalId from match_id', () => {
      const dto = normalizer.normalizeMatch(mockMatch);
      expect(dto.externalId).toBe('292061');
    });

    it('should set home team name and badge', () => {
      const dto = normalizer.normalizeMatch(mockMatch);
      expect(dto.homeTeam.name).toBe('Leeds United');
      expect(dto.homeTeam.logo).toBe('https://apiv3.apifootball.com/badges/2627.png');
    });

    it('should set away team name and badge', () => {
      const dto = normalizer.normalizeMatch(mockMatch);
      expect(dto.awayTeam.name).toBe('Sheffield Wednesday');
      expect(dto.awayTeam.logo).toBe('https://apiv3.apifootball.com/badges/2637.png');
    });

    it('should parse scores as numbers', () => {
      const dto = normalizer.normalizeMatch(mockMatch);
      expect(dto.homeScore).toBe(2);
      expect(dto.awayScore).toBe(1);
    });

    it('should return null score for empty string', () => {
      const noScore = { ...mockMatch, match_hometeam_score: '', match_awayteam_score: '' };
      const dto = normalizer.normalizeMatch(noScore);
      expect(dto.homeScore).toBeNull();
      expect(dto.awayScore).toBeNull();
    });

    it('should set status to FINISHED', () => {
      const dto = normalizer.normalizeMatch(mockMatch);
      expect(dto.status).toBe('FINISHED');
    });

    it('should parse startTime from match_date and match_time', () => {
      const dto = normalizer.normalizeMatch(mockMatch);
      expect(dto.startTime).toEqual(new Date('2026-04-10T20:45:00Z'));
    });

    it('should set venue from match_stadium', () => {
      const dto = normalizer.normalizeMatch(mockMatch);
      expect(dto.venue).toBe('Elland Road');
    });

    it('should extract round number from "Round 38"', () => {
      const dto = normalizer.normalizeMatch(mockMatch);
      expect(dto.round).toBe(38);
    });

    it('should set league info', () => {
      const dto = normalizer.normalizeMatch(mockMatch);
      expect(dto.league?.externalId).toBe('152');
      expect(dto.league?.name).toBe('Championship');
      expect(dto.league?.country).toBe('England');
    });

    it('should normalize goalscorers', () => {
      const dto = normalizer.normalizeMatch(mockMatch);
      expect(dto.goalscorers).toHaveLength(1);
      expect(dto.goalscorers[0].time).toBe('23');
      expect(dto.goalscorers[0].homeScorer).toBe('P. Bamford');
    });

    it('should normalize cards', () => {
      const dto = normalizer.normalizeMatch(mockMatch);
      expect(dto.cards).toHaveLength(1);
      expect(dto.cards[0].card).toBe('yellow card');
      expect(dto.cards[0].homeFault).toBe('K. Phillips');
    });

    it('should set sport to Football', () => {
      const dto = normalizer.normalizeMatch(mockMatch);
      expect(dto.sport).toBe('Football');
    });
  });

  describe('normalizeStanding', () => {
    const mockStanding: AfStanding = {
      country_name: 'England',
      league_id: '152',
      league_name: 'Championship',
      team_id: '2627',
      team_name: 'Leeds United',
      overall_promotion: 'Promotion - Premier League',
      overall_league_position: '1',
      overall_league_payed: '38',
      overall_league_W: '25',
      overall_league_D: '8',
      overall_league_L: '5',
      overall_league_GF: '70',
      overall_league_GA: '30',
      overall_league_PTS: '83',
      home_league_position: '1',
      away_league_position: '2',
      league_round: '',
      team_badge: 'https://apiv3.apifootball.com/badges/2627.png',
      fk_stage_key: '1',
      stage_name: 'Current',
    };

    it('should map position from overall_league_position', () => {
      const dto = normalizer.normalizeStanding(mockStanding);
      expect(dto.position).toBe(1);
    });

    it('should parse all stats as numbers', () => {
      const dto = normalizer.normalizeStanding(mockStanding);
      expect(dto.played).toBe(38);
      expect(dto.won).toBe(25);
      expect(dto.drawn).toBe(8);
      expect(dto.lost).toBe(5);
      expect(dto.goalsFor).toBe(70);
      expect(dto.goalsAgainst).toBe(30);
      expect(dto.points).toBe(83);
    });

    it('should set team badge', () => {
      const dto = normalizer.normalizeStanding(mockStanding);
      expect(dto.teamBadge).toBe('https://apiv3.apifootball.com/badges/2627.png');
    });

    it('should set promotion info', () => {
      const dto = normalizer.normalizeStanding(mockStanding);
      expect(dto.promotion).toBe('Promotion - Premier League');
    });
  });

  describe('normalizePlayer', () => {
    const mockPlayer: AfPlayer = {
      player_key: '777',
      player_id: '777',
      player_image: 'https://apiv3.apifootball.com/players/777.png',
      player_name: 'P. Bamford',
      player_number: '9',
      player_country: 'England',
      player_type: 'Forwards',
      player_age: '32',
      player_match_played: '35',
      player_goals: '15',
      player_yellow_cards: '3',
      player_red_cards: '0',
      player_injured: '',
      player_substitute_out: '5',
      player_substitutes_on_bench: '3',
      player_assists: '7',
      player_birthdate: '1993-09-05',
      player_is_captain: '',
      player_shots_total: '80',
      player_goals_conceded: '0',
      player_fouls_committed: '20',
      player_tackles: '5',
      player_blocks: '2',
      player_crosses_total: '10',
      player_interceptions: '3',
      player_clearances: '1',
      player_dispossesed: '15',
      player_saves: '0',
      player_inside_box_saves: '0',
      player_duels_total: '120',
      player_duels_won: '60',
      player_dribble_attempts: '40',
      player_dribble_succ: '25',
      player_pen_comm: '0',
      player_pen_won: '2',
      player_pen_scored: '2',
      player_pen_missed: '0',
      player_passes: '500',
      player_passes_accuracy: '78',
      player_key_passes: '30',
      player_woordworks: '3',
      player_rating: '7.2',
    };

    it('should map externalId from player_key', () => {
      const dto = normalizer.normalizePlayer(mockPlayer, '2627');
      expect(dto.externalId).toBe('777');
    });

    it('should parse numeric fields', () => {
      const dto = normalizer.normalizePlayer(mockPlayer, '2627');
      expect(dto.goals).toBe(15);
      expect(dto.assists).toBe(7);
      expect(dto.yellowCards).toBe(3);
      expect(dto.redCards).toBe(0);
      expect(dto.matchesPlayed).toBe(35);
    });

    it('should set position from player_type', () => {
      const dto = normalizer.normalizePlayer(mockPlayer, '2627');
      expect(dto.position).toBe('Forwards');
    });

    it('should set rating', () => {
      const dto = normalizer.normalizePlayer(mockPlayer, '2627');
      expect(dto.rating).toBe('7.2');
    });

    it('should set teamId', () => {
      const dto = normalizer.normalizePlayer(mockPlayer, '2627');
      expect(dto.teamId).toBe('2627');
    });
  });
});
