import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

@Injectable()
export class PrismaService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);
  private _client!: PrismaClient;
  private _pool!: Pool;

  constructor(private readonly configService: ConfigService) {}

  get client(): PrismaClient {
    return this._client;
  }

  async onModuleInit(): Promise<void> {
    const databaseUrl = this.configService.getOrThrow<string>('DATABASE_URL');

    this._pool = new Pool({ connectionString: databaseUrl });
    const adapter = new PrismaPg(this._pool);

    this._client = new PrismaClient({
      adapter,
      log: ['warn', 'error'],
    });

    await this._client.$connect();
    this.logger.log('Prisma connected to PostgreSQL');
  }

  async onModuleDestroy(): Promise<void> {
    await this._client.$disconnect();
    await this._pool.end();
    this.logger.log('Prisma disconnected from PostgreSQL');
  }

  /**
   * Proxy to PrismaClient so callers can use prismaService.$queryRaw etc.
   */
  get $queryRaw() {
    return this._client.$queryRaw.bind(this._client);
  }

  get $transaction() {
    return this._client.$transaction.bind(this._client);
  }

  get user() {
    return this._client.user;
  }

  get match() {
    return this._client.match;
  }

  get league() {
    return this._client.league;
  }

  get team() {
    return this._client.team;
  }

  get matchEvent() {
    return this._client.matchEvent;
  }

  get standing() {
    return this._client.standing;
  }

  get player() {
    return this._client.player;
  }
}
