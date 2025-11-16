/**
 * Standardized error types and codes for consistent API error handling
 */

export enum ErrorCode {
  // Authentication errors
  AUTH_INVALID_CREDENTIALS = 'AUTH_INVALID_CREDENTIALS',
  AUTH_TOKEN_EXPIRED = 'AUTH_TOKEN_EXPIRED',
  AUTH_TOKEN_INVALID = 'AUTH_TOKEN_INVALID',
  AUTH_MFA_REQUIRED = 'AUTH_MFA_REQUIRED',
  AUTH_MFA_INVALID = 'AUTH_MFA_INVALID',
  AUTH_SESSION_EXPIRED = 'AUTH_SESSION_EXPIRED',
  AUTH_UNAUTHORIZED = 'AUTH_UNAUTHORIZED',

  // Authorization errors
  PERM_INSUFFICIENT_PERMISSIONS = 'PERM_INSUFFICIENT_PERMISSIONS',
  PERM_ACCESS_DENIED = 'PERM_ACCESS_DENIED',
  PERM_ADMIN_REQUIRED = 'PERM_ADMIN_REQUIRED',

  // Validation errors
  VALID_INVALID_INPUT = 'VALID_INVALID_INPUT',
  VALID_MISSING_REQUIRED_FIELD = 'VALID_MISSING_REQUIRED_FIELD',
  VALID_INVALID_EMAIL = 'VALID_INVALID_EMAIL',
  VALID_INVALID_FORMAT = 'VALID_INVALID_FORMAT',
  VALID_VALUE_OUT_OF_RANGE = 'VALID_VALUE_OUT_OF_RANGE',

  // Not found errors
  NOT_FOUND_USER = 'NOT_FOUND_USER',
  NOT_FOUND_RESOURCE = 'NOT_FOUND_RESOURCE',
  NOT_FOUND_DATA = 'NOT_FOUND_DATA',

  // Business logic errors
  BIZ_DUPLICATE_RESOURCE = 'BIZ_DUPLICATE_RESOURCE',
  BIZ_INVALID_OPERATION = 'BIZ_INVALID_OPERATION',
  BIZ_QUOTA_EXCEEDED = 'BIZ_QUOTA_EXCEEDED',
  BIZ_PAYMENT_FAILED = 'BIZ_PAYMENT_FAILED',
  BIZ_PAYMENT_CANCELLED = 'BIZ_PAYMENT_CANCELLED',
  BIZ_PAYMENT_REFUNDED = 'BIZ_PAYMENT_REFUNDED',

  // External service errors
  EXT_SERVICE_UNAVAILABLE = 'EXT_SERVICE_UNAVAILABLE',
  EXT_SERVICE_TIMEOUT = 'EXT_SERVICE_TIMEOUT',
  EXT_SERVICE_ERROR = 'EXT_SERVICE_ERROR',

  // Server errors
  SERVER_INTERNAL_ERROR = 'SERVER_INTERNAL_ERROR',
  SERVER_DATABASE_ERROR = 'SERVER_DATABASE_ERROR',
  SERVER_CONFIGURATION_ERROR = 'SERVER_CONFIGURATION_ERROR',
  SERVER_RATE_LIMITED = 'SERVER_RATE_LIMITED',
}

export interface ErrorDetails {
  field?: string;
  value?: string;
  constraint?: string;
  [key: string]: unknown;
}

export interface ApiError {
  code: ErrorCode;
  message: string;
  details?: ErrorDetails;
  requestId?: string;
  timestamp?: string;
}

export interface ErrorResponse {
  error: ApiError;
}

/**
 * Base API Error class
 */
export class BaseApiError extends Error {
  public readonly code: ErrorCode;
  public readonly details?: ErrorDetails;
  public readonly requestId?: string;
  public readonly statusCode: number;

  constructor(
    code: ErrorCode,
    message: string,
    statusCode: number = 500,
    details?: ErrorDetails,
    requestId?: string
  ) {
    super(message);
    this.name = 'BaseApiError';
    this.code = code;
    this.details = details;
    this.requestId = requestId;
    this.statusCode = statusCode;
  }

  toJSON(): ApiError {
    return {
      code: this.code,
      message: this.message,
      details: this.details,
      requestId: this.requestId,
      timestamp: new Date().toISOString(),
    };
  }
}

/**
 * Authentication Errors (401)
 */
export class AuthenticationError extends BaseApiError {
  constructor(
    code: ErrorCode,
    message: string,
    details?: ErrorDetails,
    requestId?: string
  ) {
    super(code, message, 401, details, requestId);
    this.name = 'AuthenticationError';
  }
}

/**
 * Authorization Errors (403)
 */
export class AuthorizationError extends BaseApiError {
  constructor(
    code: ErrorCode,
    message: string,
    details?: ErrorDetails,
    requestId?: string
  ) {
    super(code, message, 403, details, requestId);
    this.name = 'AuthorizationError';
  }
}

/**
 * Validation Errors (400)
 */
export class ValidationError extends BaseApiError {
  constructor(
    code: ErrorCode,
    message: string,
    details?: ErrorDetails,
    requestId?: string
  ) {
    super(code, message, 400, details, requestId);
    this.name = 'ValidationError';
  }
}

/**
 * Not Found Errors (404)
 */
export class NotFoundError extends BaseApiError {
  constructor(
    code: ErrorCode,
    message: string,
    details?: ErrorDetails,
    requestId?: string
  ) {
    super(code, message, 404, details, requestId);
    this.name = 'NotFoundError';
  }
}

/**
 * Business Logic Errors (422)
 */
export class BusinessLogicError extends BaseApiError {
  constructor(
    code: ErrorCode,
    message: string,
    details?: ErrorDetails,
    requestId?: string
  ) {
    super(code, message, 422, details, requestId);
    this.name = 'BusinessLogicError';
  }
}

/**
 * External Service Errors (502/503/504)
 */
export class ExternalServiceError extends BaseApiError {
  constructor(
    code: ErrorCode,
    message: string,
    statusCode: number = 502,
    details?: ErrorDetails,
    requestId?: string
  ) {
    super(code, message, statusCode, details, requestId);
    this.name = 'ExternalServiceError';
  }
}

/**
 * Server Errors (500)
 */
export class ServerError extends BaseApiError {
  constructor(
    code: ErrorCode,
    message: string,
    details?: ErrorDetails,
    requestId?: string
  ) {
    super(code, message, 500, details, requestId);
    this.name = 'ServerError';
  }
}

/**
 * Common validation patterns
 */
export const Validation = {
  email: (email: string, requestId?: string): void => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw ErrorFactory.invalidEmail(requestId);
    }
  },

  required: (value: unknown, fieldName: string, requestId?: string): void => {
    if (!value || (typeof value === 'string' && value.trim() === '')) {
      throw ErrorFactory.missingRequiredField(fieldName, requestId);
    }
  },

  minLength: (
    value: string,
    min: number,
    fieldName: string,
    requestId?: string
  ): void => {
    if (value.length < min) {
      throw ErrorFactory.validationFailed(
        `${fieldName} must be at least ${min} characters long`,
        fieldName,
        requestId
      );
    }
  },

  maxLength: (
    value: string,
    max: number,
    fieldName: string,
    requestId?: string
  ): void => {
    if (value.length > max) {
      throw ErrorFactory.validationFailed(
        `${fieldName} must not exceed ${max} characters`,
        fieldName,
        requestId
      );
    }
  },

  range: (
    value: number,
    min: number,
    max: number,
    fieldName: string,
    requestId?: string
  ): void => {
    if (value < min || value > max) {
      throw ErrorFactory.validationFailed(
        `${fieldName} must be between ${min} and ${max}`,
        fieldName,
        requestId
      );
    }
  },
};

/**
 * Error factory functions for common scenarios
 */
export const ErrorFactory = {
  invalidCredentials: (requestId?: string) =>
    new AuthenticationError(
      ErrorCode.AUTH_INVALID_CREDENTIALS,
      'Invalid credentials',
      undefined,
      requestId
    ),

  unauthorized: (requestId?: string) =>
    new AuthenticationError(
      ErrorCode.AUTH_UNAUTHORIZED,
      'Unauthorized access',
      undefined,
      requestId
    ),

  tokenExpired: (requestId?: string) =>
    new AuthenticationError(
      ErrorCode.AUTH_TOKEN_EXPIRED,
      'Authentication token has expired',
      undefined,
      requestId
    ),

  invalidToken: (requestId?: string) =>
    new AuthenticationError(
      ErrorCode.AUTH_TOKEN_INVALID,
      'Invalid authentication token',
      undefined,
      requestId
    ),

  mfaRequired: (requestId?: string) =>
    new AuthenticationError(
      ErrorCode.AUTH_MFA_REQUIRED,
      'Multi-factor authentication required',
      undefined,
      requestId
    ),

  insufficientPermissions: (requestId?: string) =>
    new AuthorizationError(
      ErrorCode.PERM_INSUFFICIENT_PERMISSIONS,
      'Insufficient permissions',
      undefined,
      requestId
    ),

  adminRequired: (requestId?: string) =>
    new AuthorizationError(
      ErrorCode.PERM_ADMIN_REQUIRED,
      'Administrator access required',
      undefined,
      requestId
    ),

  validationFailed: (message: string, field?: string, requestId?: string) =>
    new ValidationError(
      ErrorCode.VALID_INVALID_INPUT,
      message,
      field ? { field } : undefined,
      requestId
    ),

  missingRequiredField: (field: string, requestId?: string) =>
    new ValidationError(
      ErrorCode.VALID_MISSING_REQUIRED_FIELD,
      `Missing required field: ${field}`,
      { field },
      requestId
    ),

  invalidEmail: (requestId?: string) =>
    new ValidationError(
      ErrorCode.VALID_INVALID_EMAIL,
      'Invalid email format',
      undefined,
      requestId
    ),

  userNotFound: (requestId?: string) =>
    new NotFoundError(
      ErrorCode.NOT_FOUND_USER,
      'User not found',
      undefined,
      requestId
    ),

  resourceNotFound: (resource: string, requestId?: string) =>
    new NotFoundError(
      ErrorCode.NOT_FOUND_RESOURCE,
      `${resource} not found`,
      undefined,
      requestId
    ),

  paymentFailed: (details?: ErrorDetails, requestId?: string) =>
    new BusinessLogicError(
      ErrorCode.BIZ_PAYMENT_FAILED,
      'Payment processing failed',
      details,
      requestId
    ),

  duplicateResource: (resource: string, requestId?: string) =>
    new BusinessLogicError(
      ErrorCode.BIZ_DUPLICATE_RESOURCE,
      `${resource} already exists`,
      undefined,
      requestId
    ),

  serviceUnavailable: (service: string, requestId?: string) =>
    new ExternalServiceError(
      ErrorCode.EXT_SERVICE_UNAVAILABLE,
      `${service} service is currently unavailable`,
      503,
      undefined,
      requestId
    ),

  internalError: (
    message: string = 'Internal server error',
    details?: ErrorDetails,
    requestId?: string
  ) =>
    new ServerError(
      ErrorCode.SERVER_INTERNAL_ERROR,
      message,
      details,
      requestId
    ),

  databaseError: (
    message: string = 'Database operation failed',
    requestId?: string
  ) =>
    new ServerError(
      ErrorCode.SERVER_DATABASE_ERROR,
      message,
      undefined,
      requestId
    ),
};
