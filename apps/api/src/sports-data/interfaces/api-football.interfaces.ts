/**
 * Raw API response types from APIFootball.com v3.
 * All fields are strings as returned by the API.
 */

export interface AfMatch {
  match_id: string;
  country_id: string;
  country_name: string;
  league_id: string;
  league_name: string;
  match_date: string;
  match_status: string;
  match_time: string;
  match_hometeam_id: string;
  match_hometeam_name: string;
  match_hometeam_score: string;
  match_awayteam_id: string;
  match_awayteam_name: string;
  match_awayteam_score: string;
  match_hometeam_halftime_score: string;
  match_awayteam_halftime_score: string;
  match_hometeam_extra_score: string;
  match_awayteam_extra_score: string;
  match_hometeam_penalty_score: string;
  match_awayteam_penalty_score: string;
  match_hometeam_ft_score: string;
  match_awayteam_ft_score: string;
  match_hometeam_system: string;
  match_awayteam_system: string;
  match_live: string;
  match_round: string;
  match_stadium: string;
  match_referee: string;
  team_home_badge: string;
  team_away_badge: string;
  league_logo: string;
  country_logo: string;
  league_year: string;
  fk_stage_key: string;
  stage_name: string;
  goalscorer: AfGoalscorer[];
  cards: AfCard[];
  substitutions: { home: AfSubstitution[]; away: AfSubstitution[] };
  lineup: { home: AfLineup; away: AfLineup };
  statistics: AfStatistic[];
  statistics_1half: AfStatistic[];
}

export interface AfGoalscorer {
  time: string;
  home_scorer: string;
  home_scorer_id: string;
  home_assist: string;
  home_assist_id: string;
  score: string;
  away_scorer: string;
  away_scorer_id: string;
  away_assist: string;
  away_assist_id: string;
  info: string;
  score_info_time: string;
}

export interface AfCard {
  time: string;
  home_fault: string;
  card: string;
  away_fault: string;
  info: string;
  home_player_id: string;
  away_player_id: string;
  score_info_time: string;
}

export interface AfSubstitution {
  time: string;
  substitution: string;
  substitution_out?: string;
  substitution_player_id: string;
}

export interface AfLineup {
  starting_lineups: AfLineupPlayer[];
  substitutes: AfLineupPlayer[];
  coach: AfCoach[];
  missing_players: AfLineupPlayer[];
}

export interface AfLineupPlayer {
  lineup_player: string;
  lineup_number: string;
  lineup_position: string;
  player_key: string;
}

export interface AfCoach {
  lineup_player: string;
  lineup_number: string;
  lineup_position: string;
  player_key: string;
}

export interface AfStatistic {
  type: string;
  home: string;
  away: string;
}

export interface AfStanding {
  country_name: string;
  league_id: string;
  league_name: string;
  team_id: string;
  team_name: string;
  overall_promotion: string;
  overall_league_position: string;
  overall_league_payed: string;
  overall_league_W: string;
  overall_league_D: string;
  overall_league_L: string;
  overall_league_GF: string;
  overall_league_GA: string;
  overall_league_PTS: string;
  home_league_position: string;
  away_league_position: string;
  league_round: string;
  team_badge: string;
  fk_stage_key: string;
  stage_name: string;
}

export interface AfTeam {
  team_key: string;
  team_name: string;
  team_country: string;
  team_founded: string;
  team_badge: string;
  venue: {
    venue_name: string;
    venue_address: string;
    venue_city: string;
    venue_capacity: string;
    venue_surface: string;
  };
  players: AfPlayer[];
  coaches: AfCoachInfo[];
}

export interface AfPlayer {
  player_key: string;
  player_id: string;
  player_image: string;
  player_name: string;
  player_number: string;
  player_country: string;
  player_type: string;
  player_age: string;
  player_match_played: string;
  player_goals: string;
  player_yellow_cards: string;
  player_red_cards: string;
  player_injured: string;
  player_substitute_out: string;
  player_substitutes_on_bench: string;
  player_assists: string;
  player_birthdate: string;
  player_is_captain: string;
  player_shots_total: string;
  player_goals_conceded: string;
  player_fouls_committed: string;
  player_tackles: string;
  player_blocks: string;
  player_crosses_total: string;
  player_interceptions: string;
  player_clearances: string;
  player_dispossesed: string;
  player_saves: string;
  player_inside_box_saves: string;
  player_duels_total: string;
  player_duels_won: string;
  player_dribble_attempts: string;
  player_dribble_succ: string;
  player_pen_comm: string;
  player_pen_won: string;
  player_pen_scored: string;
  player_pen_missed: string;
  player_passes: string;
  player_passes_accuracy: string;
  player_key_passes: string;
  player_woordworks: string;
  player_rating: string;
}

export interface AfCoachInfo {
  coach_name: string;
  coach_country: string;
  coach_age: string;
}

export interface AfOdds {
  match_id: string;
  odd_bookmakers: string;
  odd_date: string;
  odd_1: string;
  odd_x: string;
  odd_2: string;
  bts_yes: string;
  bts_no: string;
  [key: string]: string;
}

export interface AfH2H {
  firstTeam_VS_secondTeam: AfMatch[];
  firstTeam_lastResults: AfMatch[];
  secondTeam_lastResults: AfMatch[];
}

export interface AfLeague {
  country_id: string;
  country_name: string;
  league_id: string;
  league_name: string;
  league_season: string;
  league_logo: string;
  country_logo: string;
}

export interface AfErrorResponse {
  error: number;
  message: string;
}
