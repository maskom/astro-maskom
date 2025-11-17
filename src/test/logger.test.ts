import { describe, it, expect, vi } from 'vitest';
import { Logger, LogEntry, LogContext } from '../lib/logger';

describe('Logger', () => {
  it('should create logger with default log level', () => {
    const testLogger = new Logger();
    expect(testLogger).toBeDefined();
  });

  it('should log debug messages', () => {
    const testLogger = new Logger();
    const consoleSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});

    testLogger.debug('Test debug message', { key: 'value' });

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('DEBUG: Test debug message')
    );
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('"key":"value"')
    );

    consoleSpy.mockRestore();
  });

  it('should log info messages', () => {
    const testLogger = new Logger();
    const consoleSpy = vi.spyOn(console, 'info').mockImplementation(() => {});

    testLogger.info('Test info message');

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('INFO: Test info message')
    );

    consoleSpy.mockRestore();
  });

  it('should log warning messages', () => {
    const testLogger = new Logger();
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    testLogger.warn('Test warning message');

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('WARN: Test warning message')
    );

    consoleSpy.mockRestore();
  });

  it('should log error messages with stack trace', () => {
    const testLogger = new Logger();
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const testError = new Error('Test error');

    testLogger.error('Test error message', testError);

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('ERROR: Test error message')
    );
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('Error: Test error')
    );

    consoleSpy.mockRestore();
  });

  it('should handle unknown errors in apiError', () => {
    const testLogger = new Logger();
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    testLogger.apiError('Test API error', 'Unknown error string');

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('ERROR: Test API error')
    );

    consoleSpy.mockRestore();
  });

  it('should respect log level filtering', () => {
    // Create a new logger instance with ERROR log level
    const originalEnv = process.env.LOG_LEVEL;
    process.env.LOG_LEVEL = 'error';

    const testLogger = new Logger();

    const debugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});
    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    testLogger.debug('Debug message');
    testLogger.info('Info message');
    testLogger.warn('Warning message');
    testLogger.error('Error message');

    expect(debugSpy).not.toHaveBeenCalled();
    expect(infoSpy).not.toHaveBeenCalled();
    expect(warnSpy).not.toHaveBeenCalled();
    expect(errorSpy).toHaveBeenCalled();

    debugSpy.mockRestore();
    infoSpy.mockRestore();
    warnSpy.mockRestore();
    errorSpy.mockRestore();

    // Restore original env
    process.env.LOG_LEVEL = originalEnv;
  });

  it('should sanitize sensitive data in context', () => {
    const testLogger = new Logger();
    const consoleSpy = vi.spyOn(console, 'info').mockImplementation(() => {});

    const sensitiveContext = {
      username: 'john',
      password: 'secret123',
      token: 'abc123xyz',
      apiKey: 'def456',
      authHeader: 'Bearer token123',
      cookie: 'session=abc123',
      normalField: 'visible',
    };

    testLogger.info('Test message', sensitiveContext);

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('"password":"[REDACTED]"')
    );
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('"token":"[REDACTED]"')
    );
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('"authHeader":"[REDACTED]"')
    );
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('"cookie":"[REDACTED]"')
    );
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('"normalField":"visible"')
    );

    consoleSpy.mockRestore();
  });

  it('should format structured log correctly', () => {
    const testLogger = new Logger();

    // Access private method through type assertion for testing
    const loggerInstance = testLogger as unknown as {
      formatStructuredLog: (entry: LogEntry) => object;
    };
    const mockEntry: LogEntry = {
      level: 'info',
      message: 'Test message',
      timestamp: '2025-11-17T12:35:00.000Z',
      context: { userId: '123' },
    };

    const structuredLog = loggerInstance.formatStructuredLog(mockEntry);

    expect(structuredLog).toHaveProperty(
      'timestamp',
      '2025-11-17T12:35:00.000Z'
    );
    expect(structuredLog).toHaveProperty('level', 'info');
    expect(structuredLog).toHaveProperty('message', 'Test message');
    expect(structuredLog).toHaveProperty('context');
    expect(structuredLog).toHaveProperty('service', 'maskom-website');
    expect((structuredLog as { error?: unknown }).error).toBeUndefined();
  });

  it('should handle both import.meta.env and process.env for log level', () => {
    const originalEnv = process.env.LOG_LEVEL;

    // Test with process.env
    process.env.LOG_LEVEL = 'warn';
    const testLogger1 = new Logger();

    const debugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    testLogger1.debug('Should not log');
    testLogger1.warn('Should log');

    expect(debugSpy).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalled();

    debugSpy.mockRestore();
    warnSpy.mockRestore();

    // Restore
    process.env.LOG_LEVEL = originalEnv;
  });

  it('should format structured log with error correctly', () => {
    const testLogger = new Logger();

    // Access private method through type assertion for testing
    const loggerInstance = testLogger as unknown as {
      formatStructuredLog: (entry: LogEntry) => object;
    };
    const mockEntry: LogEntry = {
      level: 'error',
      message: 'Test error message',
      timestamp: '2025-11-17T12:35:00.000Z',
      context: { userId: '123' },
      error: {
        name: 'Error',
        message: 'Test error',
        stack: 'Error: Test error\n    at test',
      },
    };

    const structuredLog = loggerInstance.formatStructuredLog(mockEntry);

    expect(structuredLog).toHaveProperty(
      'timestamp',
      '2025-11-17T12:35:00.000Z'
    );
    expect(structuredLog).toHaveProperty('level', 'error');
    expect(structuredLog).toHaveProperty('message', 'Test error message');
    expect(structuredLog).toHaveProperty('context');
    expect(structuredLog).toHaveProperty('service', 'maskom-website');
    expect(
      (structuredLog as { error: { name: string; message: string } }).error
    ).toHaveProperty('name', 'Error');
    expect(
      (structuredLog as { error: { name: string; message: string } }).error
    ).toHaveProperty('message', 'Test error');
    expect(
      (
        structuredLog as {
          error: { name: string; message: string; stack?: string };
        }
      ).error
    ).not.toHaveProperty('stack');
  });

  it('should sanitize context with sensitive data', () => {
    const testLogger = new Logger();

    // Access private method through type assertion for testing
    const loggerInstance = testLogger as unknown as {
      sanitizeContext: (context?: LogContext) => LogContext | undefined;
    };
    const sensitiveContext: LogContext = {
      username: 'john',
      password: 'secret123',
      token: 'abc123xyz',
      secretKey: 'def456',
      authHeader: 'Bearer token123',
      cookie: 'session=abc123',
      normalField: 'visible',
    };

    const sanitized = loggerInstance.sanitizeContext(sensitiveContext);

    expect(sanitized?.password).toBe('[REDACTED]');
    expect(sanitized?.token).toBe('[REDACTED]');
    expect(sanitized?.secretKey).toBe('[REDACTED]');
    expect(sanitized?.authHeader).toBe('[REDACTED]');
    expect(sanitized?.cookie).toBe('[REDACTED]');
    expect(sanitized?.username).toBe('john');
    expect(sanitized?.normalField).toBe('visible');
  });
});
