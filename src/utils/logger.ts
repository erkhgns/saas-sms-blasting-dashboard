const isDev = import.meta.env.DEV;

type LogLevel = "info" | "warn" | "error" | "debug";

const styles: Record<LogLevel, string> = {
  info:  "color: #3b82f6; font-weight: bold",
  warn:  "color: #f59e0b; font-weight: bold",
  error: "color: #ef4444; font-weight: bold",
  debug: "color: #8b5cf6; font-weight: bold",
};

function log(level: LogLevel, tag: string, message: string, data?: unknown) {
  if (!isDev) return;
  const prefix = `%c[${tag}]`;
  if (data !== undefined) {
    console[level](prefix, styles[level], message, data);
  } else {
    console[level](prefix, styles[level], message);
  }
}

export const logger = {
  info:  (tag: string, message: string, data?: unknown) => log("info",  tag, message, data),
  warn:  (tag: string, message: string, data?: unknown) => log("warn",  tag, message, data),
  error: (tag: string, message: string, data?: unknown) => log("error", tag, message, data),
  debug: (tag: string, message: string, data?: unknown) => log("debug", tag, message, data),
};
