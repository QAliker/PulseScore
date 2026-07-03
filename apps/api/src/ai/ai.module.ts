import { Module } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';
import { SportsDataModule } from '../sports-data/sports-data.module';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { LlmClient, openAiProvider } from './llm.client';
import { ToolRegistry } from './tool-registry';

@Module({
  imports: [
    SportsDataModule,
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 10 }]),
  ],
  controllers: [AiController],
  providers: [AiService, LlmClient, ToolRegistry, openAiProvider],
})
export class AiModule {}
