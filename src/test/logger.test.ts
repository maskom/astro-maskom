import { describe, it, expect, vi } from 'vitest';
import { Logger, LogLevel } from '../lib/logger';

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
});
