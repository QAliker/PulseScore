import {
  BadRequestException,
  Body,
  Controller,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { AiService } from './ai.service';
import type { ChatRequestDto } from './dto/chat.dto';

@Controller('ai')
@UseGuards(ThrottlerGuard)
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('chat')
  async chat(
    @Body() body: ChatRequestDto,
  ): Promise<{ answer: string; toolsUsed: string[] }> {
    if (!body?.messages?.length) {
      throw new BadRequestException('messages must be a non-empty array');
    }
    return this.aiService.chat(body.messages);
  }
}
