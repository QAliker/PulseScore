import { Controller, Get, Sse, MessageEvent } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { LivescoreService } from '../services/livescore.service';

@Controller('livescore')
export class LivescoreController {
  constructor(private readonly livescoreService: LivescoreService) {}

  @Get()
  getCurrent() {
    return this.livescoreService.getCurrent();
  }

  @Sse('stream')
  stream(): Observable<MessageEvent> {
    return this.livescoreService.liveMatches$.pipe(
      map((matches) => ({ data: JSON.stringify(matches) }) as MessageEvent),
    );
  }
}
