/** 网页内容提取服务 - 基于 cheerio */

import fetch from "node-fetch";
import * as cheerio from "cheerio";
import { config } from "../utils/config.js";
import { logger } from "../utils/logger.js";
import { rateLimiter } from "../utils/rate-limiter.js";
import { MemoryCache } from "./cache.js";
import type { FetchWebpageResponse, PageMetadata } from "../types/index.js";

const webpageCache = new MemoryCache<FetchWebpageResponse>();

/**
 * 提取指定 URL 的网页正文内容，自动过滤广告和导航
 */
export async function fetchWebpage(
  url: string,
  maxLength: number = 5000,
  includeMetadata: boolean = true
): Promise<FetchWebpageResponse> {
  const cacheKey = `webpage:${url}:${maxLength}:${includeMetadata}`;
  const cached = webpageCache.get(cacheKey);
  if (cached) return cached;

  if (!rateLimiter.tryAcquire()) {
    throw new Error("Rate limit exceeded. Please try again later.");
  }

  logger.info(`Fetching webpage: ${url}`);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), config.request.timeout);

  const response = await fetch(url, {
    method: "GET",
    headers: {
      "User-Agent": config.request.userAgent,
      Accept: "text/html,application/xhtml+xml",
    },
    signal: controller.signal,
  }).finally(() => clearTimeout(timeoutId));

  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`);
  }

  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("text/html") && !contentType.includes("application/xhtml")) {
    throw new Error(`Unsupported content type: ${contentType}`);
  }

  const html = await response.text();
  const $ = cheerio.load(html);

  // 移除干扰元素
  $("script, style, nav, header, footer, aside, iframe, noscript").remove();

  // 提取元数据
  const metadata: PageMetadata | undefined = includeMetadata
    ? {
        description:
          $('meta[name="description"]').attr("content") ||
          $('meta[property="og:description"]').attr("content") ||
          undefined,
        author:
          $('meta[name="author"]').attr("content") || undefined,
        publishedTime:
          $('meta[property="article:published_time"]').attr("content") ||
          $('time[datetime]').attr("datetime") ||
          undefined,
      }
    : undefined;

  // 使用 Readability 提取正文
  const cleanedHtml = $.html();
  const dom = cheerio.load(cleanedHtml);

  // Readability 需要 DOM 节点 — 使用 cheerio 的根节点
  // 由于 @mozilla/readability 需要 WHATWG DOM，我们使用 cheerio 的 text 提取作为 fallback
  const title =
    dom("title").text() ||
    $('meta[property="og:title"]').attr("content") ||
    $('h1').first().text() ||
    "";

  // 提取正文：优先使用 article 标签，其次 main 标签，最后 body
  const contentContainer =
    dom("article").length > 0
      ? dom("article")
      : dom("main").length > 0
        ? dom("main")
        : dom("body");

  // 清理并提取文本内容
  contentContainer.find("script, style, nav, header, footer, aside").remove();
  let content = contentContainer.text();

  // 清理多余空白
  content = content
    .replace(/\s+/g, " ")
    .replace(/\n\s*\n/g, "\n")
    .trim();

  // 截断到最大长度
  if (content.length > maxLength) {
    content = content.slice(0, maxLength) + "...";
  }

  const result: FetchWebpageResponse = {
    title: title.trim(),
    content,
    url,
    length: content.length,
    metadata,
  };

  webpageCache.set(cacheKey, result);
  logger.info(`Extracted ${content.length} chars from ${url}`);

  return result;
}
