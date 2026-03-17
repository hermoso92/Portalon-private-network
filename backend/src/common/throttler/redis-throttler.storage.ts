import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ThrottlerStorage } from '@nestjs/throttler';
import Redis from 'ioredis';

/**
 * Redis-backed throttler storage for @nestjs/throttler v5.
 * Falls back to in-memory Map if Redis is unavailable.
 * Fallback Map is pruned every 5 minutes to prevent memory leaks.
 */
@Injectable()
export class RedisThrottlerStorage implements ThrottlerStorage, OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisThrottlerStorage.name);
  private redis: Redis | null = null;
  private readonly fallback = new Map<string, { hits: number; expiresAt: number }>();
  private cleanupTimer: ReturnType<typeof setInterval> | null = null;

  constructor(private config: ConfigService) {
    const host = this.config.get<string>('REDIS_HOST');
    if (host) {
      this.redis = new Redis({
        host,
        port: this.config.get<number>('REDIS_PORT', 6379),
        password: this.config.get<string>('REDIS_PASSWORD'),
        lazyConnect: true,
        maxRetriesPerRequest: 1,
      });
      this.redis.on('error', (err) => {
        this.logger.warn(`Redis throttler error: ${err.message} — falling back to memory`);
      });
    }
  }

  onModuleInit() {
    // Prune expired fallback entries every 5 minutes
    this.cleanupTimer = setInterval(() => {
      const now = Date.now();
      for (const [key, entry] of this.fallback) {
        if (entry.expiresAt <= now) this.fallback.delete(key);
      }
    }, 5 * 60 * 1000);
  }

  async increment(key: string, ttl: number): Promise<{ totalHits: number; timeToExpire: number }> {
    if (!this.redis) return this.incrementFallback(key, ttl);

    const redisKey = `throttle:${key}`;
    try {
      const pipeline = this.redis.pipeline();
      pipeline.incr(redisKey);
      pipeline.pttl(redisKey);
      const results = await pipeline.exec();

      const totalHits = (results?.[0]?.[1] as number) ?? 1;
      let timeToExpire = (results?.[1]?.[1] as number) ?? -1;

      if (timeToExpire === -1) {
        // Key just created — set TTL (ttl is in milliseconds)
        await this.redis.pexpire(redisKey, ttl);
        timeToExpire = ttl;
      }

      return { totalHits, timeToExpire };
    } catch {
      return this.incrementFallback(key, ttl);
    }
  }

  private incrementFallback(key: string, ttl: number): { totalHits: number; timeToExpire: number } {
    const now = Date.now();
    const entry = this.fallback.get(key);

    if (!entry || entry.expiresAt <= now) {
      this.fallback.set(key, { hits: 1, expiresAt: now + ttl });
      return { totalHits: 1, timeToExpire: ttl };
    }

    entry.hits++;
    return { totalHits: entry.hits, timeToExpire: entry.expiresAt - now };
  }

  async onModuleDestroy() {
    if (this.cleanupTimer) clearInterval(this.cleanupTimer);
    if (this.redis) await this.redis.quit();
  }
}
