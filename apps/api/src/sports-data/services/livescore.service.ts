import { Injectable } from '@nestjs/common';
import { LiveStreamService } from './live-stream.service';
import { MatchDto } from '../dto/match.dto';

@Injectable()
export class LivescoreService {
  constructor(private readonly liveStream: LiveStreamService) {}

  async getCurrent(): Promise<MatchDto[]> {
    return this.liveStream.snapshot();
  }
}
