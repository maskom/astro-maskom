/**
 * Simplified error handling system
 * Provides essential error types with clear usage guidelines
 */

// Error codes for consistent error identification
export enum ErrorCode {
  // Authentication errors
  AUTH_INVALID_CREDENTIALS = 'AUTH_INVALID_CREDENTIALS',
  AUTH_TOKEN_EXPIRED = 'AUTH_TOKEN_EXPIRED',
  AUTH_UNAUTHORIZED = 'AUTH_UNAUTHORIZED',
  AUTH_MFA_REQUIRED = 'AUTH_MFA_REQUIRED',

  // Authorization errors
  PERM_INSUFFICIENT_PERMISSIONS = 'PERM_INSUFFICIENT_PERMISSIONS',
  PERM_ACCESS_DENIED = 'PERM_ACCESS_DENIED',

  // Validation errors
  VALID_INVALID_INPUT = 'VALID_INVALID_INPUT',
  VALID_MISSING_REQUIRED_FIELD = 'VALID_MISSING_REQUIRED_FIELD',
  VALID_INVALID_EMAIL = 'VALID_INVALID_EMAIL',
  VALID_INVALID_FORMAT = 'VALID_INVALID_FORMAT',

  // Not found errors
  NOT_FOUND_USER = 'NOT_FOUND_USER',
  NOT_FOUND_RESOURCE = 'NOT_FOUND_RESOURCE',

  // Business logic errors
  BIZ_DUPLICATE_RESOURCE = 'BIZ_DUPLICATE_RESOURCE',
  BIZ_INVALID_OPERATION = 'BIZ_INVALID_OPERATION',
  BIZ_PAYMENT_FAILED = 'BIZ_PAYMENT_FAILED',

  // External service errors
  EXT_SERVICE_UNAVAILABLE = 'EXT_SERVICE_UNAVAILABLE',
  EXT_SERVICE_TIMEOUT = 'EXT_SERVICE_TIMEOUT',

  // Server errors
  SERVER_INTERNAL_ERROR = 'SERVER_INTERNAL_ERROR',
  SERVER_DATABASE_ERROR = 'SERVER_DATABASE_ERROR',
  SERVER_RATE_LIMITED = 'SERVER_RATE_LIMITED',
}

// Error details interface
export interface ErrorDetails {
  field?: string;
  value?: string;
  constraint?: string;
  [key: string]: unknown;
}

// Error response interface for backward compatibility
export interface ErrorResponse {
  error: {
    code: string;
    message: string;
    details?: ErrorDetails;
    requestId?: string;
    timestamp: string;
  };
}

/**
 * Base application error class
 * All other errors should extend this class
 */
export class AppError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly details?: ErrorDetails;
  public readonly requestId?: string;

  constructor(
    message: string,
    code: string,
    statusCode: number = 500,
    details?: ErrorDetails,
    requestId?: string
  ) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    this.requestId = requestId;

    // Maintains proper stack trace for where our error was thrown
    Error.captureStackTrace(this, AppError);
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      statusCode: this.statusCode,
      details: this.details,
      requestId: this.requestId,
      timestamp: new Date().toISOString(),
    };
  }
}

/**
 * Validation error (400)
 * Use for input validation failures
 */
export class ValidationError extends AppError {
  constructor(message: string, details?: ErrorDetails, requestId?: string) {
    super(message, ErrorCode.VALID_INVALID_INPUT, 400, details, requestId);
    this.name = 'ValidationError';
  }
}

/**
 * Authentication error (401)
 * Use for authentication failures
 */
export class AuthenticationError extends AppError {
  constructor(
    message: string = 'Authentication failed',
    details?: ErrorDetails,
    requestId?: string
  ) {
    super(message, ErrorCode.AUTH_UNAUTHORIZED, 401, details, requestId);
    this.name = 'AuthenticationError';
  }
}

/**
 * Authorization error (403)
 * Use for permission/authorization failures
 */
export class AuthorizationError extends AppError {
  constructor(
    message: string = 'Access denied',
    details?: ErrorDetails,
    requestId?: string
  ) {
    super(
      message,
      ErrorCode.PERM_INSUFFICIENT_PERMISSIONS,
      403,
      details,
      requestId
    );
    this.name = 'AuthorizationError';
  }
}

/**
 * Not found error (404)
 * Use for resource not found scenarios
 */
export class NotFoundError extends AppError {
  constructor(
    message: string = 'Resource not found',
    details?: ErrorDetails,
    requestId?: string
  ) {
    super(message, ErrorCode.NOT_FOUND_RESOURCE, 404, details, requestId);
    this.name = 'NotFoundError';
  }
}

/**
 * Database error (500)
 * Use for database operation failures
 */
export class DatabaseError extends AppError {
  constructor(
    message: string = 'Database operation failed',
    details?: ErrorDetails,
    requestId?: string
  ) {
    super(message, ErrorCode.SERVER_DATABASE_ERROR, 500, details, requestId);
    this.name = 'DatabaseError';
  }
}

/**
 * Error factory for common error scenarios
 * Provides convenient methods to create standardized errors
 */
export class ErrorFactory {
  // Authentication errors
  static invalidCredentials(requestId?: string) {
    return new AuthenticationError('Invalid credentials', undefined, requestId);
  }

  static tokenExpired(requestId?: string) {
    return new AuthenticationError(
      'Authentication token has expired',
      undefined,
      requestId
    );
  }

  static unauthorized(requestId?: string) {
    return new AuthenticationError('Unauthorized access', undefined, requestId);
  }

  static mfaRequired(requestId?: string) {
    return new AuthenticationError(
      'Multi-factor authentication required',
      { code: ErrorCode.AUTH_MFA_REQUIRED },
      requestId
    );
  }

  // Authorization errors
  static insufficientPermissions(requestId?: string) {
    return new AuthorizationError(
      'Insufficient permissions',
      undefined,
      requestId
    );
  }

  static accessDenied(requestId?: string) {
    return new AuthorizationError('Access denied', undefined, requestId);
  }

  // Validation errors
  static validationFailed(message: string, field?: string, requestId?: string) {
    return new ValidationError(
      message,
      field ? { field } : undefined,
      requestId
    );
  }

  static missingRequiredField(field: string, requestId?: string) {
    return new ValidationError(
      `Missing required field: ${field}`,
      { field },
      requestId
    );
  }

  static invalidEmail(requestId?: string) {
    return new ValidationError(
      'Invalid email format',
      { constraint: 'email_format' },
      requestId
    );
  }

  static invalidFormat(field: string, format: string, requestId?: string) {
    return new ValidationError(
      `Invalid ${field} format`,
      { field, constraint: format },
      requestId
    );
  }

  // Not found errors
  static userNotFound(requestId?: string) {
    return new NotFoundError('User not found', { resource: 'user' }, requestId);
  }

  static resourceNotFound(resource: string, id?: string, requestId?: string) {
    return new NotFoundError(
      `${resource} not found`,
      { resource, id },
      requestId
    );
  }

  // Business logic errors
  static duplicateResource(resource: string, requestId?: string) {
    return new AppError(
      `${resource} already exists`,
      ErrorCode.BIZ_DUPLICATE_RESOURCE,
      422,
      { resource },
      requestId
    );
  }

  static invalidOperation(message: string, requestId?: string) {
    return new AppError(
      message,
      ErrorCode.BIZ_INVALID_OPERATION,
      422,
      undefined,
      requestId
    );
  }

  static paymentFailed(
    message: string = 'Payment processing failed',
    details?: ErrorDetails,
    requestId?: string
  ) {
    return new AppError(
      message,
      ErrorCode.BIZ_PAYMENT_FAILED,
      422,
      details,
      requestId
    );
  }

  // External service errors
  static serviceUnavailable(service: string, requestId?: string) {
    return new AppError(
      `${service} service is currently unavailable`,
      ErrorCode.EXT_SERVICE_UNAVAILABLE,
      503,
      { service },
      requestId
    );
  }

  static serviceTimeout(service: string, requestId?: string) {
    return new AppError(
      `${service} service timed out`,
      ErrorCode.EXT_SERVICE_TIMEOUT,
      504,
      { service },
      requestId
    );
  }

  // Server errors
  static internalError(
    message: string = 'Internal server error',
    details?: ErrorDetails,
    requestId?: string
  ) {
    return new AppError(
      message,
      ErrorCode.SERVER_INTERNAL_ERROR,
      500,
      details,
      requestId
    );
  }

  static databaseError(
    message?: string,
    details?: ErrorDetails,
    requestId?: string
  ) {
    return new DatabaseError(
      message || 'Database operation failed',
      details,
      requestId
    );
  }

  static rateLimited(requestId?: string) {
    return new AppError(
      'Rate limit exceeded',
      ErrorCode.SERVER_RATE_LIMITED,
      429,
      undefined,
      requestId
    );
  }

  // Additional backward compatibility methods
  static validationError(message: string, field?: string, requestId?: string) {
    return new ValidationError(
      message,
      field ? { field } : undefined,
      requestId
    );
  }

  static notFound(resource?: string, requestId?: string) {
    return new NotFoundError(
      resource ? `${resource} not found` : 'Resource not found',
      resource ? { resource } : undefined,
      requestId
    );
  }

  static invalidToken(requestId?: string) {
    return new AuthenticationError(
      'Invalid authentication token',
      undefined,
      requestId
    );
  }

  static adminRequired(requestId?: string) {
    return new AuthorizationError(
      'Administrator access required',
      undefined,
      requestId
    );
  }
}

/**
 * Validation utilities for common validation patterns
 */
export class Validation {
  static email(email: string, requestId?: string): void {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw ErrorFactory.invalidEmail(requestId);
    }
  }

  static required(value: unknown, fieldName: string, requestId?: string): void {
    if (!value || (typeof value === 'string' && value.trim() === '')) {
      throw ErrorFactory.missingRequiredField(fieldName, requestId);
    }
  }

  static minLength(
    value: string,
    min: number,
    fieldName: string,
    requestId?: string
  ): void {
    if (value.length < min) {
      throw ErrorFactory.validationFailed(
        `${fieldName} must be at least ${min} characters long`,
        fieldName,
        requestId
      );
    }
  }

  static maxLength(
    value: string,
    max: number,
    fieldName: string,
    requestId?: string
  ): void {
    if (value.length > max) {
      throw ErrorFactory.validationFailed(
        `${fieldName} must not exceed ${max} characters`,
        fieldName,
        requestId
      );
    }
  }

  static range(
    value: number,
    min: number,
    max: number,
    fieldName: string,
    requestId?: string
  ): void {
    if (value < min || value > max) {
      throw ErrorFactory.validationFailed(
        `${fieldName} must be between ${min} and ${max}`,
        fieldName,
        requestId
      );
    }
  }

  static regex(
    value: string,
    pattern: RegExp,
    fieldName: string,
    requestId?: string
  ): void {
    if (!pattern.test(value)) {
      throw ErrorFactory.validationFailed(
        `${fieldName} format is invalid`,
        fieldName,
        requestId
      );
    }
  }

  static oneOf<T>(
    value: T,
    allowedValues: T[],
    fieldName: string,
    requestId?: string
  ): void {
    if (!allowedValues.includes(value)) {
      throw ErrorFactory.validationFailed(
        `${fieldName} must be one of: ${allowedValues.join(', ')}`,
        fieldName,
        requestId
      );
    }
  }

  static integer(value: unknown, fieldName: string, requestId?: string): void {
    if (!Number.isInteger(Number(value))) {
      throw ErrorFactory.validationFailed(
        `${fieldName} must be an integer`,
        fieldName,
        requestId
      );
    }
  }

  static boolean(value: unknown, fieldName: string, requestId?: string): void {
    if (typeof value !== 'boolean') {
      throw ErrorFactory.validationFailed(
        `${fieldName} must be a boolean`,
        fieldName,
        requestId
      );
    }
  }
}

/**
 * Error handling utilities
 */
export class ErrorUtils {
  /**
   * Check if an error is a specific error type
   */
  static isAppError(error: unknown): error is AppError {
    return error instanceof AppError;
  }

  /**
   * Get error code from error
   */
  static getErrorCode(error: unknown): string | null {
    if (this.isAppError(error)) {
      return error.code;
    }
    return null;
  }

  /**
   * Get status code from error
   */
  static getStatusCode(error: unknown): number {
    if (this.isAppError(error)) {
      return error.statusCode;
    }
    return 500;
  }

  /**
   * Convert any error to AppError
   */
  static normalizeError(error: unknown, requestId?: string): AppError {
    if (this.isAppError(error)) {
      return error;
    }

    if (error instanceof Error) {
      return new AppError(
        error.message,
        ErrorCode.SERVER_INTERNAL_ERROR,
        500,
        { originalError: error.name },
        requestId
      );
    }

    return new AppError(
      'An unknown error occurred',
      ErrorCode.SERVER_INTERNAL_ERROR,
      500,
      { originalError: String(error) },
      requestId
    );
  }

  /**
   * Create error response object
   */
  static createErrorResponse(error: AppError) {
    return {
      success: false,
      error: {
        code: error.code,
        message: error.message,
        details: error.details,
        requestId: error.requestId,
        timestamp: new Date().toISOString(),
      },
    };
  }
}

// Export commonly used types and utilities
export { AppError as Error }; // Alias for backward compatibility
export default AppError;
