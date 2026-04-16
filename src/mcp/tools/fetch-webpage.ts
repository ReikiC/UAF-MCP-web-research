/** MCP 工具: fetch_webpage - 网页内容提取 */

import { z } from "zod";
import { fetchWebpage } from "../../services/content-extractor.js";

export const fetchWebpageSchema = {
  url: z.string().describe("目标网页 URL"),
  max_length: z
    .number()
    .min(500)
    .max(20000)
    .default(5000)
    .describe("返回内容最大字符数（500-20000）"),
  include_metadata: z
    .boolean()
    .default(true)
    .describe("是否包含页面元数据（标题、描述、作者等）"),
};

export async function fetchWebpageTool(params: {
  url: string;
  max_length?: number;
  include_metadata?: boolean;
}) {
  const result = await fetchWebpage(
    params.url,
    params.max_length,
    params.include_metadata
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
