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
  [key: string]: any;
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

class Logger {
  private logLevel: LogLevel;
  private isDevelopment: boolean;

  constructor() {
    this.isDevelopment = import.meta.env.DEV;
    this.logLevel = this.getLogLevel();
  }

  private getLogLevel(): LogLevel {
    const envLevel = import.meta.env.LOG_LEVEL?.toUpperCase();
    if (
      envLevel &&
      Object.values(LogLevel).includes(envLevel.toLowerCase() as LogLevel)
    ) {
      return envLevel.toLowerCase() as LogLevel;
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

  private formatLog(entry: LogEntry): string {
    const contextStr = entry.context ? ` ${JSON.stringify(entry.context)}` : '';
    const errorStr = entry.error
      ? ` ${entry.error.name}: ${entry.error.message}`
      : '';
    return `[${entry.timestamp}] ${entry.level.toUpperCase()}: ${entry.message}${contextStr}${errorStr}`;
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
      // In production, you might want to send to a logging service
      // For now, we'll use console.error for errors and console.log for others
      if (level === LogLevel.ERROR) {
        console.error(formattedLog);
      } else {
        console.log(formattedLog);
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
};
