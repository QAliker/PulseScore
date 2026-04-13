import { ApiFootballClient } from '../client/api-football.client';
import { ConfigService } from '@nestjs/config';

// We test the WebSocket methods structurally since we can't easily mock the ws module
describe('ApiFootballClient — WebSocket', () => {
  let client: ApiFootballClient;

  beforeEach(() => {
    const mockConfigService: Partial<ConfigService> = {
      get: jest.fn((key: string) => {
        if (key === 'APIFOOTBALL_API_KEY') return 'test-api-key';
        if (key === 'APIFOOTBALL_TIMEZONE') return 'Europe/Paris';
        return undefined;
      }),
    };
    client = new ApiFootballClient(mockConfigService as ConfigService);
  });

  afterEach(() => {
    client.disconnectWebSocket();
  });

  it('should register a livescore callback', () => {
    const callback = jest.fn();
    client.onLivescoreMessage(callback);
    // Verify the callback was stored (internal state)
    expect((client as any).livescoreCallback).toBe(callback);
  });

  it('should disconnect cleanly when not connected', () => {
    // Should not throw even when no WebSocket is connected
    expect(() => client.disconnectWebSocket()).not.toThrow();
  });

  it('should reset reconnect attempts on disconnect', () => {
    (client as any).reconnectAttempts = 5;
    client.disconnectWebSocket();
    expect((client as any).reconnectAttempts).toBe(0);
  });
});
