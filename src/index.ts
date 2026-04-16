#!/usr/bin/env node

/** UAF-MCP-web-research 服务器入口 */

import http from "node:http";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { createServer } from "./mcp/server.js";
import { config } from "./utils/config.js";
import { logger } from "./utils/logger.js";

const SSE_PORT = parseInt(process.env.SSE_PORT || "3456", 10);

async function startStdio() {
  const { StdioServerTransport } = await import(
    "@modelcontextprotocol/sdk/server/stdio.js"
  );
  const server = createServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  logger.info("Server started (stdio transport)");
}

async function startSSE() {
  const transports = new Map<string, SSEServerTransport>();

  const httpServer = http.createServer(async (req, res) => {
    const url = new URL(req.url || "/", `http://localhost:${SSE_PORT}`);

    if (req.method === "GET" && url.pathname === "/sse") {
      // SSE 连接建立
      const transport = new SSEServerTransport("/messages", res);
      transports.set(transport.sessionId, transport);

      transport.onclose = () => {
        transports.delete(transport.sessionId);
      };

      const server = createServer();
      await server.connect(transport);
      logger.info(`SSE client connected: ${transport.sessionId}`);
      return;
    }

    if (req.method === "POST" && url.pathname === "/messages") {
      // 接收客户端消息
      const sessionId = url.searchParams.get("sessionId");
      if (!sessionId) {
        res.writeHead(400).end("Missing sessionId");
        return;
      }
      const transport = transports.get(sessionId);
      if (!transport) {
        res.writeHead(404).end("Session not found");
        return;
      }
      await transport.handlePostMessage(req, res);
      return;
    }

    res.writeHead(404).end("Not found");
  });

  httpServer.listen(SSE_PORT, () => {
    logger.info(
      `SSE server listening on http://localhost:${SSE_PORT}/sse`
    );
  });
}

async function main() {
  const mode = process.env.MCP_TRANSPORT || "stdio";

  if (mode === "sse") {
    await startSSE();
  } else {
    await startStdio();
  }
}

main().catch((err) => {
  logger.error("Fatal error starting server:", err);
  process.exit(1);
});
