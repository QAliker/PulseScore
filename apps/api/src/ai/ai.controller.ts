import {
  BadRequestException,
  Body,
  Controller,
  Logger,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { AiService } from './ai.service';
import type { ChatRequestDto } from './dto/chat.dto';

@Controller('ai')
@UseGuards(ThrottlerGuard)
export class AiController {
  private readonly logger = new Logger(AiController.name);

  constructor(private readonly aiService: AiService) {}

  @Post('chat')
  async chat(
    @Body() body: ChatRequestDto,
  ): Promise<{ answer: string; toolsUsed: string[] }> {
    if (!body?.messages?.length) {
      throw new BadRequestException('messages must be a non-empty array');
    }
    try {
      return await this.aiService.chat(body.messages);
    } catch (err) {
      // The LLM provider or a tool failed. Log the real cause and degrade
      // gracefully instead of a blank 500 the user can't act on.
      this.logger.error(
        `chat failed: ${err instanceof Error ? err.stack : String(err)}`,
      );
      return {
        answer:
          "Sorry — I couldn't reach the assistant just now. Please try again in a moment.",
        toolsUsed: [],
      };
    }
  }
}
