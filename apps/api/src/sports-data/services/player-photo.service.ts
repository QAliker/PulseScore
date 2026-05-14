import { Injectable, Logger } from '@nestjs/common';
import { SportsDataCacheService } from '../sports-data-cache.service';
import { LineupPlayerDto } from '../dto/match.dto';

const TTL_PHOTO_HIT = 30 * 24 * 60 * 60; // 30 days
const TTL_PHOTO_MISS = 7 * 24 * 60 * 60; // 7 days — don't retry missing players often
const TSDB_BASE = 'https://www.thesportsdb.com/api/v1/json/3';

interface TsdbSearchResponse {
  player?: Array<{
    strCutout?: string | null;
    strThumb?: string | null;
  }> | null;
}

@Injectable()
export class PlayerPhotoService {
  private readonly logger = new Logger(PlayerPhotoService.name);

  constructor(private readonly cacheService: SportsDataCacheService) {}

  async enrichPhotos(players: LineupPlayerDto[]): Promise<void> {
    if (!players.length) return;
    await Promise.all(players.map((p) => this.applyPhoto(p)));
  }

  private async applyPhoto(player: LineupPlayerDto): Promise<void> {
    const photo = await this.getPhoto(player.name);
    if (photo) player.photo = photo;
  }

  private async getPhoto(name: string): Promise<string | null> {
    const key = `photo:tsdb:${this.norm(name)}`;
    const cached = await this.cacheService.getCached<string>(key);
    if (cached !== null) return cached || null; // empty string = confirmed miss

    try {
      const res = await fetch(
        `${TSDB_BASE}/searchplayers.php?p=${encodeURIComponent(name)}`,
      );
      if (!res.ok) return null;
      const data = (await res.json()) as TsdbSearchResponse;
      const photo =
        data.player?.[0]?.strCutout || data.player?.[0]?.strThumb || '';
      await this.cacheService.setCached(
        key,
        photo,
        photo ? TTL_PHOTO_HIT : TTL_PHOTO_MISS,
      );
      return photo || null;
    } catch (err) {
      this.logger.warn(
        `TSDB photo lookup failed for "${name}": ${String(err)}`,
      );
      return null;
    }
  }

  private norm(s: string): string {
    return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
  }
}
