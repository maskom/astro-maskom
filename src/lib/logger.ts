export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
}

export interface LogContext {
  requestId?: string;
  userId?: string;
  service?: string;
  action?: string;
  timestamp?: string;
  ip?: string;
  userAgent?: string;
  method?: string;
  url?: string;
  statusCode?: number;
  duration?: number;
  module?: string;
  operation?: string;
  [key: string]: string | number | boolean | undefined;
}

export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  context?: LogContext;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

// Generate unique request ID
export function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

class Logger {
  private logLevel: LogLevel;
  private isDevelopment: boolean;

  constructor() {
    this.isDevelopment = import.meta.env.DEV;
    this.logLevel = this.getLogLevel();
  }

  private getLogLevel(): LogLevel {
    // Check both import.meta.env (Vite) and process.env (Node/test)
    const envLevel = import.meta.env.LOG_LEVEL || process.env.LOG_LEVEL;
    const normalizedLevel = envLevel?.toUpperCase();

    if (
      normalizedLevel &&
      Object.values(LogLevel).includes(
        normalizedLevel.toLowerCase() as LogLevel
      )
    ) {
      return normalizedLevel.toLowerCase() as LogLevel;
    }
    return this.isDevelopment ? LogLevel.DEBUG : LogLevel.INFO;
  }

  private shouldLog(level: LogLevel): boolean {
    const levels = [
      LogLevel.DEBUG,
      LogLevel.INFO,
      LogLevel.WARN,
      LogLevel.ERROR,
    ];
    const currentLevelIndex = levels.indexOf(this.logLevel);
    const messageLevelIndex = levels.indexOf(level);
    return messageLevelIndex >= currentLevelIndex;
  }

  private sanitizeContext(context?: LogContext): LogContext | undefined {
    if (!context) return undefined;

    const sanitized: LogContext = {};
    const sensitiveKeys = ['password', 'token', 'secret', 'auth', 'cookie'];

    for (const [key, value] of Object.entries(context)) {
      const lowerKey = key.toLowerCase();
      if (sensitiveKeys.some(sensitive => lowerKey.includes(sensitive))) {
        sanitized[key] = '[REDACTED]';
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }

  private formatLog(entry: LogEntry): string {
    const sanitizedContext = this.sanitizeContext(entry.context);
    const contextStr = sanitizedContext
      ? ` ${JSON.stringify(sanitizedContext)}`
      : '';
    const errorStr = entry.error
      ? ` ${entry.error.name}: ${entry.error.message}`
      : '';
    return `[${entry.timestamp}] ${entry.level.toUpperCase()}: ${entry.message}${contextStr}${errorStr}`;
  }

  private formatStructuredLog(entry: LogEntry): object {
    const sanitizedContext = this.sanitizeContext(entry.context);

    return {
      timestamp: entry.timestamp,
      level: entry.level,
      message: entry.message,
      context: sanitizedContext,
      error: entry.error
        ? {
            name: entry.error.name,
            message: entry.error.message,
          }
        : undefined,
      service: 'maskom-website',
    };
  }

  private log(
    level: LogLevel,
    message: string,
    context?: LogContext,
    error?: Error
  ): void {
    if (!this.shouldLog(level)) {
      return;
    }

    const logEntry: LogEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      context,
      error: error
        ? {
            name: error.name,
            message: error.message,
            stack: this.isDevelopment ? error.stack : undefined,
          }
        : undefined,
    };

    const formattedLog = this.formatLog(logEntry);

    if (this.isDevelopment) {
      // Use console methods in development for better debugging
      switch (level) {
        case LogLevel.DEBUG:
          console.debug(formattedLog);
          break;
        case LogLevel.INFO:
          console.info(formattedLog);
          break;
        case LogLevel.WARN:
          console.warn(formattedLog);
          break;
        case LogLevel.ERROR:
          console.error(formattedLog);
          if (error && error.stack) {
            console.error(error.stack);
          }
          break;
      }
    } else {
      // In production, use structured logging with sanitization
      const structuredLog = this.formatStructuredLog(logEntry);

      // Always use console.error for errors, console.log for others
      // This ensures proper log level handling in production environments
      if (level === LogLevel.ERROR) {
        console.error(JSON.stringify(structuredLog));
      } else {
        console.log(JSON.stringify(structuredLog));
      }
    }
  }

  debug(message: string, context?: LogContext): void {
    this.log(LogLevel.DEBUG, message, context);
  }

  info(message: string, context?: LogContext): void {
    this.log(LogLevel.INFO, message, context);
  }

  warn(message: string, context?: LogContext): void {
    this.log(LogLevel.WARN, message, context);
  }

  error(message: string, error?: Error, context?: LogContext): void {
    this.log(LogLevel.ERROR, message, context, error);
  }

  // Helper method for API errors
  apiError(message: string, error: unknown, context?: LogContext): void {
    const errorObj = error instanceof Error ? error : new Error(String(error));
    this.error(message, errorObj, context);
  }

  // Create a child logger with predefined context
  child(context: LogContext): {
    debug: (message: string, additionalContext?: LogContext) => void;
    info: (message: string, additionalContext?: LogContext) => void;
    warn: (message: string, additionalContext?: LogContext) => void;
    error: (
      message: string,
      error?: Error,
      additionalContext?: LogContext
    ) => void;
  } {
    return {
      debug: (message: string, additionalContext?: LogContext) =>
        this.debug(message, { ...context, ...additionalContext }),
      info: (message: string, additionalContext?: LogContext) =>
        this.info(message, { ...context, ...additionalContext }),
      warn: (message: string, additionalContext?: LogContext) =>
        this.warn(message, { ...context, ...additionalContext }),
      error: (message: string, error?: Error, additionalContext?: LogContext) =>
        this.error(message, error, { ...context, ...additionalContext }),
    };
  }
}

// Export Logger class for testing
export { Logger };

// Create and export singleton logger instance
export const logger = new Logger();

// Export convenience functions
export const log = {
  debug: (message: string, context?: LogContext) =>
    logger.debug(message, context),
  info: (message: string, context?: LogContext) =>
    logger.info(message, context),
  warn: (message: string, context?: LogContext) =>
    logger.warn(message, context),
  error: (message: string, error?: Error, context?: LogContext) =>
    logger.error(message, error, context),
  apiError: (message: string, error: unknown, context?: LogContext) =>
    logger.apiError(message, error, context),
  child: (context: LogContext) => logger.child(context),
};
