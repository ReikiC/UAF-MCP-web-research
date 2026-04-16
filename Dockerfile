FROM node:20-slim

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY tsconfig.json ./
COPY src/ ./src/
RUN npm run build

RUN npm prune --omit=dev

ENV MCP_TRANSPORT=sse
EXPOSE 3456

CMD ["node", "dist/index.js"]
