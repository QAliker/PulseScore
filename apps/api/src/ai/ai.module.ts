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
    // Per IP. Each chat can make up to MAX_ITERATIONS LLM calls; these keep one
    // visitor from burning the Groq free tier (~30 req/min, 1k req/day).
    ThrottlerModule.forRoot([
      { name: 'minute', ttl: 60_000, limit: 5 },
      { name: 'day', ttl: 86_400_000, limit: 50 },
    ]),
  ],
  controllers: [AiController],
  providers: [AiService, LlmClient, ToolRegistry, openAiProvider],
})
export class AiModule {}
