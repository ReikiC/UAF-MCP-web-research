/** SearXNG 搜索结果项 */
export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
  engine: string;
  score: number;
}

/** search_web 返回结果 */
export interface SearchResponse {
  results: SearchResult[];
  total: number;
  query: string;
}

/** 网页元数据 */
export interface PageMetadata {
  description?: string;
  author?: string;
  publishedTime?: string;
}

/** fetch_webpage 返回结果 */
export interface FetchWebpageResponse {
  title: string;
  content: string;
  url: string;
  length: number;
  metadata?: PageMetadata;
}

/** deep_research 采集的内容项 */
export interface CollectedContent {
  source: string;
  query: string;
  title: string;
  url: string;
  content: string;
}

/** deep_research 返回结果 */
export interface DeepResearchResponse {
  topic: string;
  collected_content: CollectedContent[];
  total_sources: number;
  rounds_completed: number;
  aspects_covered: string[];
}

/** 缓存条目 */
export interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}
