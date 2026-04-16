/** 内存 TTL 缓存 - 进程内缓存，非持久化 */

import type { CacheEntry } from "../types/index.js";
import { config } from "../utils/config.js";
import { logger } from "../utils/logger.js";

export class MemoryCache<T> {
  private cache = new Map<string, CacheEntry<T>>();
  private readonly ttlMs: number;
  private readonly maxSize: number;

  constructor(
    ttlSeconds: number = config.cache.ttl,
    maxSize: number = config.cache.maxSize
  ) {
    this.ttlMs = ttlSeconds * 1000;
    this.maxSize = maxSize;
  }

  /** 获取缓存值 */
  get(key: string): T | undefined {
    const entry = this.cache.get(key);
    if (!entry) return undefined;

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return undefined;
    }

    logger.debug(`Cache hit: ${key}`);
    return entry.value;
  }

  /** 设置缓存值 */
  set(key: string, value: T): void {
    // 如果缓存已满，清除过期条目
    if (this.cache.size >= this.maxSize) {
      this.evict();
    }

    this.cache.set(key, {
      value,
      expiresAt: Date.now() + this.ttlMs,
    });
    logger.debug(`Cache set: ${key}`);
  }

  /** 清除过期条目，如果仍然超限则移除最旧的 */
  private evict(): void {
    const now = Date.now();
    // 先清除所有过期条目
    for (const [key, entry] of this.cache) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
      }
    }
    // 如果还是满的，移除最早过期的条目
    if (this.cache.size >= this.maxSize) {
      let oldestKey = "";
      let oldestTime = Infinity;
      for (const [key, entry] of this.cache) {
        if (entry.expiresAt < oldestTime) {
          oldestTime = entry.expiresAt;
          oldestKey = key;
        }
      }
      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }
  }

  /** 清除所有缓存 */
  clear(): void {
    this.cache.clear();
  }

  /** 当前缓存条目数 */
  get size(): number {
    return this.cache.size;
  }
}
