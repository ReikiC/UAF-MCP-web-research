/** MCP 服务器定义 - 注册所有工具 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { searchWebSchema, searchWebTool } from "./tools/search-web.js";
import { fetchWebpageSchema, fetchWebpageTool } from "./tools/fetch-webpage.js";
import { deepResearchSchema, deepResearchTool } from "./tools/deep-research.js";

export function createServer(): McpServer {
  const server = new McpServer({
    name: "web-research",
    version: "1.0.0",
  });

  // 注册 search_web 工具
  server.tool(
    "search_web",
    "搜索互联网，返回相关结果列表。通过 SearXNG 聚合多个搜索引擎结果。",
    searchWebSchema,
    searchWebTool
  );

  // 注册 fetch_webpage 工具
  server.tool(
    "fetch_webpage",
    "提取指定 URL 的网页正文内容，自动过滤广告、导航等干扰内容。",
    fetchWebpageSchema,
    fetchWebpageTool
  );

  // 注册 deep_research 工具
  server.tool(
    "deep_research",
    "对指定话题进行多轮搜索和内容提取，将所有采集到的原始素材返回给 Agent，由 Agent 自行总结分析。",
    deepResearchSchema,
    deepResearchTool
  );

  return server;
}
