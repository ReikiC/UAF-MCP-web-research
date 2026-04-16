/** 速率限制器 - 基于令牌桶算法 */

import { config } from "./config.js";
import { logger } from "./logger.js";

export class RateLimiter {
  private tokens: number;
  private readonly maxTokens: number;
  private readonly refillIntervalMs: number;
  private lastRefillTime: number;

  constructor(rpm: number = config.rateLimit.rpm) {
    this.maxTokens = rpm;
    this.tokens = rpm;
    this.refillIntervalMs = 60_000; // 1 分钟
    this.lastRefillTime = Date.now();
  }

  /** 补充令牌 */
  private refill(): void {
    const now = Date.now();
    const elapsed = now - this.lastRefillTime;

    if (elapsed >= this.refillIntervalMs) {
      const periods = Math.floor(elapsed / this.refillIntervalMs);
      this.tokens = Math.min(
        this.maxTokens,
        this.tokens + periods * this.maxTokens
      );
      this.lastRefillTime = now - (elapsed % this.refillIntervalMs);
    }
  }

  /** 尝试获取一个令牌，返回是否成功 */
  tryAcquire(): boolean {
    this.refill();
    if (this.tokens > 0) {
      this.tokens--;
      return true;
    }
    logger.warn("Rate limit reached, request rejected");
    return false;
  }

  /** 获取当前可用令牌数 */
  get availableTokens(): number {
    this.refill();
    return this.tokens;
  }
}

/** 全局速率限制器实例 */
export const rateLimiter = new RateLimiter();
