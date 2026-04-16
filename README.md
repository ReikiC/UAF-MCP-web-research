# UAF-MCP-web-research

> 基于 Model Context Protocol (MCP) 的联网搜索服务，为 UAF 的 AI Agent 提供实时网络信息检索能力（TypeScript/Node.js 实现）

## 简介

UAF 的配套 MCP 业务（联网搜索）服务。需配合 UAF 的核心项目使用，通过 MCP 协议为 UAF 的 Agent 提供联网搜索、网页内容提取和深度研究能力。

## 设计理念

### 采集不分析 · 无状态 · 纯 MCP · 轻量化

本服务遵循以下核心设计原则：

1. **采集不分析** - MCP 工具只负责从互联网**采集和返回原始内容**，不做任何汇总、分析或总结。所有内容的理解、归纳和回复由 Agent（LLM）完成
2. **无状态设计** - 不依赖外部数据库，不存储搜索历史。每次请求独立处理，降低运维复杂度
3. **纯 MCP 模式** - 仅提供 MCP 协议接口，无需 HTTP REST API 和独立前端
4. **SearXNG 驱动** - 基于自部署的 SearXNG 元搜索引擎，聚合 Google/Bing/DuckDuckGo 等多引擎结果，无商业 API 费用

### 为什么这样设计？

- **职责清晰**：MCP 是"眼睛和手"（采集信息），Agent 是"大脑"（理解和回复）。分工明确，不越界
- **简洁性**：无状态 + 纯 MCP = 零外部依赖（除 SearXNG），部署和运维极其简单
- **经济性**：SearXNG 开源自部署，无 API 调用费用和配额限制
- **隐私性**：搜索请求通过自部署实例发出，数据不经第三方

### 数据流

```
用户提问 → Agent(Orchestrator) → 调用 MCP 工具采集信息
                                      │
                    ┌─────────────────┤
                    ▼                 ▼
              search_web        fetch_webpage
              (搜索结果列表)    (网页正文内容)
                    │                 │
                    └────────┬────────┘
                             ▼
                    Agent 拿到原始内容
                             │
                             ▼
                    Agent 自行总结分析
                             │
                             ▼
                    生成最终回复给用户
```

## 技术栈

- **TypeScript 5+** - 类型安全
- **Node.js 20+** - 运行时
- **@modelcontextprotocol/sdk** - MCP 官方 SDK
- **SearXNG** - 自部署元搜索引擎（支持 Google/Bing/DuckDuckGo 等聚合）
- **@mozilla/readability** - 网页正文提取（Mozilla Readability 算法）
- **cheerio** - HTML 解析（服务端 jQuery API）
- **Zod** - 参数验证
- **node-fetch** - HTTP 请求

## 核心特性

- **多引擎搜索** - 通过 SearXNG 聚合多个搜索引擎结果
- **智能内容提取** - 自动识别网页正文，过滤广告和导航
- **批量采集** - 多轮搜索 + 批量提取，为 Agent 提供丰富素材
- **分类过滤** - 支持按类别搜索（通用/新闻/学术/IT 等）
- **语言偏好** - 可指定搜索结果语言
- **速率控制** - 内置请求限流和超时保护
- **内存缓存** - TTL 缓存避免重复请求（进程内，非持久化）

## MCP 工具定义

本服务提供以下 MCP 工具供 LLM Agent 调用：

### 工具列表

| 工具名称 | 描述 | 使用场景 |
|---------|------|---------|
| `search_web` | 网页搜索，返回搜索结果列表 | Agent 需要获取某个话题的最新信息 |
| `fetch_webpage` | 提取指定 URL 的网页正文内容 | Agent 需要深入了解某个搜索结果的详细内容 |
| `deep_research` | 批量采集，多轮搜索+提取多源原始内容 | Agent 需要对某个话题全面采集素材后再自行分析 |

### search_web

搜索互联网，返回相关结果列表。

**参数：**

| 参数 | 类型 | 必需 | 默认值 | 描述 |
|------|------|------|--------|------|
| `query` | string | 是 | - | 搜索关键词 |
| `categories` | string | 否 | `"general"` | 搜索类别：`general`(通用)、`news`(新闻)、`science`(学术)、`it`(技术)、`images`(图片) |
| `language` | string | 否 | `"zh-CN"` | 搜索结果语言偏好 |
| `max_results` | number | 否 | `10` | 返回结果数量上限（1-20） |

**返回结果：**
```json
{
  "results": [
    {
      "title": "结果标题",
      "url": "https://example.com/page",
      "snippet": "内容摘要...",
      "engine": "google",
      "score": 0.85
    }
  ],
  "total": 42,
  "query": "搜索关键词"
}
```

### fetch_webpage

提取指定 URL 的网页正文内容，自动过滤广告、导航等干扰内容。

**参数：**

| 参数 | 类型 | 必需 | 默认值 | 描述 |
|------|------|------|--------|------|
| `url` | string | 是 | - | 目标网页 URL |
| `max_length` | number | 否 | `5000` | 返回内容最大字符数（500-20000） |
| `include_metadata` | boolean | 否 | `true` | 是否包含页面元数据（标题、描述、作者等） |

**返回结果：**
```json
{
  "title": "页面标题",
  "content": "正文内容...",
  "url": "https://example.com/page",
  "length": 3200,
  "metadata": {
    "description": "页面描述",
    "author": "作者",
    "publishedTime": "2026-04-15"
  }
}
```

### deep_research

对指定话题进行多轮搜索和内容提取，将所有采集到的原始素材返回给 Agent，由 Agent 自行总结分析。

**参数：**

| 参数 | 类型 | 必需 | 默认值 | 描述 |
|------|------|------|--------|------|
| `topic` | string | 是 | - | 研究主题 |
| `aspects` | string[] | 否 | `[]` | 需要重点关注的方面（如 ["技术方案", "市场趋势", "竞品分析"]），会为每个方面生成一轮搜索 |
| `depth` | number | 否 | `3` | 搜索轮数（1-5），每轮从不同角度搜索并提取内容 |
| `language` | string | 否 | `"zh-CN"` | 搜索结果语言偏好 |

**返回结果（原始素材集合，非总结）：**
```json
{
  "topic": "量子计算应用",
  "collected_content": [
    {
      "source": "搜索结果 - 第1轮",
      "query": "量子计算应用",
      "title": "量子计算在金融领域的应用前景",
      "url": "https://example.com/article-1",
      "content": "正文内容原文..."
    },
    {
      "source": "搜索结果 - 第2轮",
      "query": "量子计算 技术突破",
      "title": "2026年量子计算最新进展",
      "url": "https://example.com/article-2",
      "content": "正文内容原文..."
    }
  ],
  "total_sources": 6,
  "rounds_completed": 3,
  "aspects_covered": ["技术方案", "市场趋势"]
}
```

**工作流程：**

```
deep_research("量子计算应用", aspects=["技术", "商业化"])
│
├─ 第1轮: 搜索 "量子计算应用" (general)
│  └─ 提取 Top 3 结果的完整正文
│
├─ 第2轮: 搜索 "量子计算 技术突破" (science)
│  └─ 提取 Top 3 结果的完整正文
│
├─ 第3轮: 搜索 "量子计算 商业化" (general)
│  └─ 提取 Top 3 结果的完整正文
│
└─ 汇总所有原始内容 → 返回给 Agent
   Agent 拿到素材后自行总结分析 → 回复用户
```

## 项目结构

```
UAF-MCP-web-research/
├── src/
│   ├── index.ts                # 服务器入口
│   │
│   ├── mcp/                    # MCP 协议层
│   │   ├── server.ts           # MCP 服务器定义
│   │   └── tools/              # MCP 工具实现
│   │       ├── search-web.ts   # 网页搜索
│   │       ├── fetch-webpage.ts # 网页内容提取
│   │       └── deep-research.ts # 深度研究
│   │
│   ├── services/               # 核心服务
│   │   ├── searxng.ts          # SearXNG API 客户端
│   │   ├── content-extractor.ts # 网页内容提取（Readability）
│   │   └── cache.ts            # 内存 TTL 缓存
│   │
│   ├── utils/                  # 工具函数
│   │   ├── config.ts           # 配置管理
│   │   ├── logger.ts           # 日志工具
│   │   └── rate-limiter.ts     # 速率限制器
│   │
│   └── types/                  # 类型定义
│       └── index.ts            # 共享类型
│
├── docs/
│   └── design/
│       └── architecture.md     # 架构设计文档
│
├── .env.example
├── package.json
├── tsconfig.json
└── README.md
```

## 在 UAF-Orchestrator 中集成

在 UAF-Orchestrator 的 MCP 配置中添加：

```json
{
  "name": "web-research",
  "display_name": "联网搜索",
  "command": "node",
  "args": [
    "--loader",
    "ts-node/esm",
    "/path/to/UAF-MCP-web-research/src/index.ts"
  ],
  "env": {
    "SEARXNG_BASE_URL": "http://localhost:8888",
    "SEARXNG_API_KEY": "",
    "REQUEST_TIMEOUT": "15000",
    "CACHE_TTL": "300",
    "LOG_LEVEL": "info"
  }
}
```

## 环境变量

| 变量 | 必需 | 默认值 | 描述 |
|------|------|--------|------|
| `SEARXNG_BASE_URL` | 是 | - | SearXNG 实例地址（如 `http://localhost:8888`） |
| `SEARXNG_API_KEY` | 否 | - | SearXNG API 密钥（如果配置了） |
| `SEARXNG_SECRET_KEY` | 否 | - | SearXNG secret key（用于私有实例） |
| `REQUEST_TIMEOUT` | 否 | `15000` | HTTP 请求超时（毫秒） |
| `CACHE_TTL` | 否 | `300` | 内存缓存 TTL（秒），0 禁用缓存 |
| `CACHE_MAX_SIZE` | 否 | `100` | 最大缓存条目数 |
| `RATE_LIMIT_RPM` | 否 | `30` | 每分钟最大请求数 |
| `USER_AGENT` | 否 | `UAF-WebResearch/1.0` | HTTP 请求 User-Agent |
| `LOG_LEVEL` | 否 | `info` | 日志级别（debug/info/warn/error） |
| `NODE_ENV` | 否 | `development` | 运行环境 |

## 快速开始

```bash
# 克隆项目
git clone https://github.com/ReikiC/UAF-MCP-web-research.git
cd UAF-MCP-web-research

# 安装依赖
npm install

# 配置环境变量
cp .env.example .env
# 编辑 .env 文件，配置 SearXNG 实例地址

# 开发模式运行
npm run dev

# 构建
npm run build

# 生产模式运行
npm start
```

### 前置条件

- Node.js 20+
- 运行中的 SearXNG 实例（[部署指南](https://docs.searxng.org/admin/installation-searxng.html)）

```bash
# 快速启动 SearXNG（Docker）
docker run -d -p 8888:8080 \
  -e SEARXNG_BASE_URL=http://localhost:8888 \
  --name searxng \
  searxng/searxng
```

## 相关项目

**UAF 生态系统** - 请配合使用：

### 核心组件

| 项目 | 说明 | 地址 |
|------|------|------|
| **UAF-Orchestrator** | Agent 编排框架（LangChain + LangGraph） | [https://github.com/ReikiC/UAF-Orchestrator](https://github.com/ReikiC/UAF-Orchestrator) |
| **UAF-Frontend-nuomi** | 前端界面（React + TypeScript + Vite） | [https://github.com/ReikiC/UAF-Frontend-nuomi](https://github.com/ReikiC/UAF-Frontend-nuomi) |
| **UAF-Data-Base** | PostgreSQL 数据库配置 | [https://github.com/ReikiC/UAF-Data-Base](https://github.com/ReikiC/UAF-Data-Base) |

### MCP 业务模块

| 项目 | 说明 | 地址 |
|------|------|------|
| **UAF-MCP-RAG-Server** | 知识库搜索服务（MCP 协议） | [https://github.com/ReikiC/UAF-MCP-RAG-Server](https://github.com/ReikiC/UAF-MCP-RAG-Server) |
| **UAF-MCP-RAG-Frontend** | 知识库前端界面 | [https://github.com/ReikiC/UAF-MCP-RAG-Frontend](https://github.com/ReikiC/UAF-MCP-RAG-Frontend) |
| **UAF-MCP-RAG-DB** | RAG 向量数据库支持 | [https://github.com/ReikiC/UAF-MCP-RAG-DB](https://github.com/ReikiC/UAF-MCP-RAG-DB) |
| **UAF-MCP-web-research** | 联网搜索服务（MCP 协议） | [https://github.com/ReikiC/UAF-MCP-web-research](https://github.com/ReikiC/UAF-MCP-web-research) |

## 许可证

Apache License 2.0
