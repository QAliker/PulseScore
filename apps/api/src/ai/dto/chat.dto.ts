export interface ChatMessageDto {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatRequestDto {
  messages: ChatMessageDto[];
}
