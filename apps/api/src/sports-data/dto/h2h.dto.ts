import { MatchDto } from './match.dto';

export class H2hDto {
  headToHead: MatchDto[];
  firstTeamResults: MatchDto[];
  secondTeamResults: MatchDto[];
}
