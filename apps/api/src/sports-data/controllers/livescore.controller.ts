import { Controller, Get } from '@nestjs/common';
import { LivescoreService } from '../services/livescore.service';

@Controller('livescore')
export class LivescoreController {
  constructor(private readonly livescoreService: LivescoreService) {}

  @Get()
  getCurrent() {
    return this.livescoreService.getCurrent();
  }
}
