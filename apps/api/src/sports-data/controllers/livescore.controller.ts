import { Controller, Get, Sse, MessageEvent } from '@nestjs/common';
import { Observable, from, merge, defer, map } from 'rxjs';
import { LivescoreService } from '../services/livescore.service';
import { LiveStreamService } from '../services/live-stream.service';

@Controller('livescore')
export class LivescoreController {
  constructor(
    private readonly livescoreService: LivescoreService,
    private readonly liveStream: LiveStreamService,
  ) {}

  @Get()
  getCurrent() {
    return this.livescoreService.getCurrent();
  }

  @Sse('stream')
  stream(): Observable<MessageEvent> {
    const initial = defer(() => from(this.liveStream.snapshot()));
    return merge(initial, this.liveStream.stream()).pipe(
      map((matches) => ({ data: matches }) as MessageEvent),
    );
  }
}
