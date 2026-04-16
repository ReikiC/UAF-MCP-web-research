/** MCP 工具: deep_research - 多轮搜索+批量内容提取 */

import { z } from "zod";
import { searchWeb } from "../../services/searxng.js";
import { fetchWebpage } from "../../services/content-extractor.js";
import { logger } from "../../utils/logger.js";
import type { CollectedContent, DeepResearchResponse } from "../../types/index.js";

export const deepResearchSchema = {
  topic: z.string().describe("研究主题"),
  aspects: z
    .array(z.string())
    .default([])
    .describe(
      '需要重点关注的方面（如 ["技术方案", "市场趋势", "竞品分析"]），会为每个方面生成一轮搜索'
    ),
  depth: z
    .number()
    .min(1)
    .max(5)
    .default(3)
    .describe("搜索轮数（1-5），每轮从不同角度搜索并提取内容"),
  language: z.string().default("zh-CN").describe("搜索结果语言偏好"),
};

export async function deepResearchTool(params: {
  topic: string;
  aspects?: string[];
  depth?: number;
  language?: string;
}) {
  const { topic, aspects = [], depth = 3, language = "zh-CN" } = params;
  const collected: CollectedContent[] = [];
  const aspectsCovered: string[] = [];

  // 构建搜索查询列表
  const queries: { query: string; label: string }[] = [];

  // 第 1 轮：主题本身
  queries.push({ query: topic, label: "搜索结果 - 第1轮" });

  // 后续轮次：每个 aspect 一轮搜索
  const aspectQueries = aspects.slice(0, depth - 1);
  for (let i = 0; i < aspectQueries.length; i++) {
    queries.push({
      query: `${topic} ${aspectQueries[i]}`,
      label: `搜索结果 - 第${i + 2}轮`,
    });
    aspectsCovered.push(aspectQueries[i]);
  }

  // 如果还有剩余轮次，补充通用查询
  const usedDepth = queries.length;
  if (usedDepth < depth) {
    const followUpAngles = ["最新进展", "分析报告", "深度解读"];
    for (
      let i = usedDepth;
      i < depth && i - usedDepth < followUpAngles.length;
      i++
    ) {
      queries.push({
        query: `${topic} ${followUpAngles[i - usedDepth]}`,
        label: `搜索结果 - 第${i + 1}轮`,
      });
    }
  }

  // 执行搜索和内容提取
  for (const { query, label } of queries.slice(0, depth)) {
    try {
      logger.info(`Deep research round: ${query}`);
      const searchResult = await searchWeb(query, "general", language, 3);

      // 提取 top 结果的正文
      const fetchPromises = searchResult.results.slice(0, 3).map(async (r) => {
        try {
          const page = await fetchWebpage(r.url, 3000, true);
          return {
            source: label,
            query,
            title: page.title || r.title,
            url: r.url,
            content: page.content,
          } satisfies CollectedContent;
        } catch (err) {
          logger.warn(`Failed to fetch ${r.url}: ${err}`);
          // 即使提取失败，也保留搜索结果摘要
          return {
            source: label,
            query,
            title: r.title,
            url: r.url,
            content: r.snippet,
          } satisfies CollectedContent;
        }
      });

      const contents = await Promise.all(fetchPromises);
      collected.push(...contents);
    } catch (err) {
      logger.error(`Deep research round failed for "${query}": ${err}`);
    }
  }

  const result: DeepResearchResponse = {
    topic,
    collected_content: collected,
    total_sources: collected.length,
    rounds_completed: queries.slice(0, depth).length,
    aspects_covered: aspectsCovered,
  };

  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(result, null, 2),
      },
    ],
  };
}
