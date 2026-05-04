import { Injectable } from '@nestjs/common';
import { Subject, Observable } from 'rxjs';
import { MatchDto } from '../dto/match.dto';

// Livescore polling is disabled — will be reconnected to a dedicated live API.
@Injectable()
export class LivescoreService {
  private readonly matchSubject = new Subject<MatchDto[]>();

  get liveMatches$(): Observable<MatchDto[]> {
    return this.matchSubject.asObservable();
  }

  async getCurrent(): Promise<MatchDto[]> {
    return [];
  }
}
