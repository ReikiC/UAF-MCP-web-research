/** 配置管理 - 从环境变量读取配置并提供默认值 */

export const config = {
  searxng: {
    baseUrl: process.env.SEARXNG_BASE_URL || "http://localhost:8888",
    apiKey: process.env.SEARXNG_API_KEY || "",
    secretKey: process.env.SEARXNG_SECRET_KEY || "",
  },
  request: {
    timeout: parseInt(process.env.REQUEST_TIMEOUT || "15000", 10),
    userAgent: process.env.USER_AGENT || "UAF-WebResearch/1.0",
  },
  cache: {
    ttl: parseInt(process.env.CACHE_TTL || "300", 10),
    maxSize: parseInt(process.env.CACHE_MAX_SIZE || "100", 10),
  },
  rateLimit: {
    rpm: parseInt(process.env.RATE_LIMIT_RPM || "30", 10),
  },
  log: {
    level: process.env.LOG_LEVEL || "info",
  },
  nodeEnv: process.env.NODE_ENV || "development",
} as const;
