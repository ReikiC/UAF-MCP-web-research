/** MCP 工具: search_web - 网页搜索 */

import { z } from "zod";
import { searchWeb } from "../../services/searxng.js";

export const searchWebSchema = {
  query: z.string().describe("搜索关键词"),
  categories: z
    .string()
    .default("general")
    .describe(
      "搜索类别：general(通用)、news(新闻)、science(学术)、it(技术)、images(图片)"
    ),
  language: z.string().default("zh-CN").describe("搜索结果语言偏好"),
  max_results: z
    .number()
    .min(1)
    .max(20)
    .default(10)
    .describe("返回结果数量上限（1-20）"),
};

export async function searchWebTool(params: {
  query: string;
  categories?: string;
  language?: string;
  max_results?: number;
}) {
  const result = await searchWeb(
    params.query,
    params.categories,
    params.language,
    params.max_results
  );
  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(result, null, 2),
      },
    ],
  };
}
