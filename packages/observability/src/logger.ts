/**
 * Logger — Structured JSON logging built on pino.
 *
 * Usage:
 *   const log = createLogger('my-service');
 *   log.info({ requestId: 'abc' }, 'request received');
 */

import pino from "pino";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface Logger {
  info(msg: string): void;
  info(obj: Record<string, unknown>, msg: string): void;
  warn(msg: string): void;
  warn(obj: Record<string, unknown>, msg: string): void;
  error(msg: string): void;
  error(obj: Record<string, unknown>, msg: string): void;
  debug(msg: string): void;
  debug(obj: Record<string, unknown>, msg: string): void;
  /** Create a child logger with additional bound context. */
  child(bindings: Record<string, unknown>): Logger;
}

export interface LoggerOptions {
  level?: string;
  /** Base bindings attached to every log line (e.g. requestId, userId). */
  bindings?: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

/**
 * Create a named structured logger.
 *
 * The log level is resolved in order: `options.level` > `LOG_LEVEL` env var
 * > `"info"`.
 */
export function createLogger(name: string, options?: LoggerOptions): Logger {
  const level =
    options?.level ?? process.env.LOG_LEVEL ?? "info";

  const base: Record<string, unknown> = {
    service: name,
    ...options?.bindings,
  };

  const instance = pino({
    name,
    level,
    base,
    timestamp: pino.stdTimeFunctions.isoTime,
    formatters: {
      level(label: string) {
        return { level: label };
      },
    },
  });

  return wrapPino(instance);
}

// ---------------------------------------------------------------------------
// Internal wrapper
// ---------------------------------------------------------------------------

/**
 * Wrap a pino instance to satisfy the `Logger` interface and make `child()`
 * return the same wrapper type.
 */
function wrapPino(instance: pino.Logger): Logger {
  return {
    info(...args: unknown[]) {
      (instance.info as Function).apply(instance, args);
    },
    warn(...args: unknown[]) {
      (instance.warn as Function).apply(instance, args);
    },
    error(...args: unknown[]) {
      (instance.error as Function).apply(instance, args);
    },
    debug(...args: unknown[]) {
      (instance.debug as Function).apply(instance, args);
    },
    child(bindings: Record<string, unknown>): Logger {
      return wrapPino(instance.child(bindings));
    },
  };
}
