/** SearXNG API 客户端 */

import fetch from "node-fetch";
import { config } from "../utils/config.js";
import { logger } from "../utils/logger.js";
import { rateLimiter } from "../utils/rate-limiter.js";
import { MemoryCache } from "./cache.js";
import type { SearchResult, SearchResponse } from "../types/index.js";

const searchCache = new MemoryCache<SearchResponse>();

/** SearXNG 返回的原始结果格式 */
interface SearXNGResult {
  title?: string;
  url?: string;
  content?: string;
  engine?: string;
  score?: number;
}

interface SearXNGResponse {
  results?: SearXNGResult[];
  number_of_results?: number;
  query?: string;
}

/**
 * 搜索互联网，通过 SearXNG 聚合多个搜索引擎结果
 */
export async function searchWeb(
  query: string,
  categories: string = "general",
  language: string = "zh-CN",
  maxResults: number = 10
): Promise<SearchResponse> {
  const cacheKey = `search:${query}:${categories}:${language}:${maxResults}`;
  const cached = searchCache.get(cacheKey);
  if (cached) return cached;

  if (!rateLimiter.tryAcquire()) {
    throw new Error("Rate limit exceeded. Please try again later.");
  }

  const url = new URL("/search", config.searxng.baseUrl);
  url.searchParams.set("q", query);
  url.searchParams.set("format", "json");
  url.searchParams.set("categories", categories);
  url.searchParams.set("language", language);

  if (config.searxng.apiKey) {
    url.searchParams.set("api_key", config.searxng.apiKey);
  }

  logger.info(`Searching: ${query} (categories=${categories}, lang=${language})`);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), config.request.timeout);

  try {
    const response = await fetch(url.toString(), {
      method: "GET",
      headers: {
        "User-Agent": config.request.userAgent,
        Accept: "application/json",
      },
      signal: controller.signal,
    });

  if (!response.ok) {
    throw new Error(`SearXNG request failed: ${response.status} ${response.statusText}`);
  }

  const data = (await response.json()) as SearXNGResponse;

    const results: SearchResult[] = (data.results || [])
      .slice(0, maxResults)
      .map((r) => ({
        title: r.title || "",
        url: r.url || "",
        snippet: r.content || "",
        engine: r.engine || "unknown",
        score: r.score || 0,
      }));

    const result: SearchResponse = {
      results,
      total: data.number_of_results || results.length,
      query,
    };

    searchCache.set(cacheKey, result);
    logger.info(`Found ${results.length} results for "${query}"`);

    return result;
  } finally {
    clearTimeout(timeoutId);
  }
}
