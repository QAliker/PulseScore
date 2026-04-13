import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import WebSocket from 'ws';
import { AfMatch } from '../interfaces/api-football.interfaces';

@Injectable()
export class ApiFootballClient {
  private readonly logger = new Logger(ApiFootballClient.name);
  private readonly baseUrl = 'https://apiv3.apifootball.com/';
  private readonly apiKey: string;
  private readonly timezone: string;
  private lastRequestAt = 0;
  private readonly minIntervalMs = 20_000; // 180 req/h ≈ 1 req per 20s
  private readonly wsUrl = 'wss://wss.apifootball.com/livescore';
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private readonly maxReconnectDelay = 60_000;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private livescoreCallback: ((data: AfMatch[]) => void) | null = null;

  constructor(private readonly configService: ConfigService) {
    this.apiKey = this.configService.get<string>('APIFOOTBALL_API_KEY') ?? '';
    this.timezone = this.configService.get<string>('APIFOOTBALL_TIMEZONE') ?? 'Europe/Paris';
  }

  private async throttle(): Promise<void> {
    const now = Date.now();
    const elapsed = now - this.lastRequestAt;
    if (elapsed < this.minIntervalMs) {
      const wait = this.minIntervalMs - elapsed;
      await new Promise<void>((resolve) => setTimeout(resolve, wait));
    }
    this.lastRequestAt = Date.now();
  }

  async get<T = unknown>(action: string, params: Record<string, string>): Promise<T> {
    await this.throttle();

    const query = new URLSearchParams({
      action,
      APIkey: this.apiKey,
      timezone: this.timezone,
      ...params,
    });

    const url = `${this.baseUrl}?${query.toString()}`;
    this.logger.debug(`GET ${url}`);

    const response = await fetch(url, {
      headers: { Accept: 'application/json' },
    });

    if (!response.ok) {
      throw new Error(`APIFootball request failed: ${response.status} ${response.statusText}`);
    }

    return response.json() as Promise<T>;
  }

  onLivescoreMessage(callback: (data: AfMatch[]) => void): void {
    this.livescoreCallback = callback;
  }

  connectWebSocket(): void {
    const url = `${this.wsUrl}?APIkey=${this.apiKey}&timezone=${this.timezone}`;
    this.logger.log(`Connecting WebSocket to ${this.wsUrl}`);

    this.ws = new WebSocket(url);

    this.ws.on('open', () => {
      this.logger.log('WebSocket connected');
      this.reconnectAttempts = 0;
      this.startHeartbeat();
    });

    this.ws.on('message', (raw: WebSocket.Data) => {
      try {
        const data = JSON.parse(raw.toString()) as AfMatch[];
        this.livescoreCallback?.(data);
      } catch (err) {
        this.logger.warn(`Failed to parse WebSocket message: ${String(err)}`);
      }
    });

    this.ws.on('error', (err: Error) => {
      this.logger.error(`WebSocket error: ${err.message}`);
    });

    this.ws.on('close', () => {
      this.logger.warn('WebSocket closed');
      this.stopHeartbeat();
      this.scheduleReconnect();
    });
  }

  disconnectWebSocket(): void {
    this.stopHeartbeat();
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.removeAllListeners();
      this.ws.close();
      this.ws = null;
    }
    this.reconnectAttempts = 0;
  }

  private scheduleReconnect(): void {
    this.reconnectAttempts++;
    const delay = Math.min(
      1000 * Math.pow(2, this.reconnectAttempts - 1),
      this.maxReconnectDelay,
    );
    this.logger.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);
    this.reconnectTimer = setTimeout(() => {
      this.connectWebSocket();
    }, delay);
  }

  private startHeartbeat(): void {
    this.heartbeatTimer = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.ping();
      }
    }, 30_000);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }
}
