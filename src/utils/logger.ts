/** 简易日志工具 */

type LogLevel = "debug" | "info" | "warn" | "error";

const LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const currentLevel: LogLevel =
  (process.env.LOG_LEVEL as LogLevel) || "info";

function shouldLog(level: LogLevel): boolean {
  return LEVEL_PRIORITY[level] >= LEVEL_PRIORITY[currentLevel];
}

function formatMessage(level: LogLevel, message: string): string {
  const timestamp = new Date().toISOString();
  return `[${timestamp}] [${level.toUpperCase()}] ${message}`;
}

export const logger = {
  debug(message: string, ...args: unknown[]) {
    if (shouldLog("debug")) {
      console.error(formatMessage("debug", message), ...args);
    }
  },
  info(message: string, ...args: unknown[]) {
    if (shouldLog("info")) {
      console.error(formatMessage("info", message), ...args);
    }
  },
  warn(message: string, ...args: unknown[]) {
    if (shouldLog("warn")) {
      console.error(formatMessage("warn", message), ...args);
    }
  },
  error(message: string, ...args: unknown[]) {
    if (shouldLog("error")) {
      console.error(formatMessage("error", message), ...args);
    }
  },
};
