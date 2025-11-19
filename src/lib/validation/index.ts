import { logger } from '../logger';
import type { APIRoute } from 'astro';

// Input validation system for API endpoints
// Provides comprehensive validation with security features and sanitization

// Enhanced validation interface
export interface ValidationSchema {
  [key: string]: ValidationRule;
}

export interface ValidationRule {
  type:
    | 'string'
    | 'number'
    | 'boolean'
    | 'array'
    | 'object'
    | 'email'
    | 'uuid'
    | 'url';
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: RegExp;
  enum?: (string | number | boolean)[];
  custom?: (value: unknown, data?: Record<string, unknown>) => boolean | string;
  sanitize?: boolean;
  description?: string;
}

export interface ValidationResult {
  isValid: boolean;
  data?: Record<string, unknown>;
  errors?: ValidationError[];
  value?: unknown;
}

export interface ValidationError {
  field: string;
  message: string;
  value?: unknown;
  constraint?: string;
}

// Request validation context
export interface ValidationContext {
  requestId?: string;
  userId?: string;
  endpoint?: string;
  method?: string;
  ip?: string;
  userAgent?: string;
  [key: string]: string | number | boolean | undefined;
}

/**
 * Centralized validation system
 */
export class ValidationEngine {
  private context: ValidationContext;

  constructor(context: ValidationContext = {}) {
    this.context = context;
  }

  /**
   * Validate request data against schema
   */
  validate(
    data: Record<string, unknown>,
    schema: ValidationSchema
  ): ValidationResult {
    const errors: ValidationError[] = [];
    const sanitizedData: Record<string, unknown> = {};
    const originalData = data;

    try {
      // Log validation attempt
      logger.debug('Starting validation', {
        ...this.context,
        schemaFields: Object.keys(schema).length,
      });

      for (const [field, rule] of Object.entries(schema)) {
        const value = data[field];
        const fieldResult = this.validateField(field, value, rule, data);

        if (!fieldResult.isValid) {
          errors.push(...(fieldResult.errors || []));
        } else if (fieldResult.value !== undefined) {
          sanitizedData[field] = fieldResult.value;
        }
      }

      const isValid = errors.length === 0;

      if (isValid) {
        logger.debug('Validation successful', {
          ...this.context,
          sanitizedFields: Object.keys(sanitizedData).length,
        });
      } else {
        logger.warn('Validation failed', {
          ...this.context,
          errorCount: errors.length,
          validationErrorCount: errors.length,
        });
      }

      return {
        isValid: errors.length === 0,
        data: isValid ? sanitizedData : undefined,
        value: isValid ? sanitizedData : undefined,
        errors: isValid ? undefined : errors,
      };
    } catch (error) {
      logger.error('Validation engine error', error as Error, this.context);
      return {
        isValid: false,
        errors: [
          {
            field: 'system',
            message: 'Validation system error',
            constraint: 'system_error',
          },
        ],
      };
    }
  }

  /**
   * Validate individual field
   */
  private validateField(
    field: string,
    value: unknown,
    rule: ValidationRule,
    originalData: Record<string, unknown>
  ): ValidationResult {
    const errors: ValidationError[] = [];
    let sanitizedValue = value;

    try {
      // Check required fields
      if (
        rule.required &&
        (value === undefined || value === null || value === '')
      ) {
        errors.push({
          field,
          message: `${field} is required`,
          constraint: 'required',
        });
        return { isValid: false, errors };
      }

      // Skip validation if field is not required and empty
      if (
        !rule.required &&
        (value === undefined || value === null || value === '')
      ) {
        return { isValid: true, value: undefined };
      }

      // Type validation
      const typeError = this.validateType(field, value, rule);
      if (typeError) {
        errors.push(typeError);
        return { isValid: false, errors };
      }

      // Sanitization
      if (rule.sanitize && typeof value === 'string') {
        sanitizedValue = this.sanitizeValue(value);
      }

      // Length validation for strings
      if (rule.type === 'string') {
        if (
          rule.type === 'string' &&
          rule.minLength !== undefined &&
          typeof sanitizedValue === 'string' &&
          sanitizedValue.length < rule.minLength
        ) {
          errors.push({
            field,
            message: `${field} must be at least ${rule.minLength} characters long`,
            value: sanitizedValue,
            constraint: 'minLength',
          });
        }

        if (
          rule.maxLength !== undefined &&
          typeof sanitizedValue === 'string' &&
          sanitizedValue.length > rule.maxLength
        ) {
          errors.push({
            field,
            message: `${field} must not exceed ${rule.maxLength} characters`,
            value: sanitizedValue,
            constraint: 'maxLength',
          });
        }

        // Pattern validation
        if (
          rule.pattern &&
          typeof sanitizedValue === 'string' &&
          !rule.pattern.test(sanitizedValue)
        ) {
          errors.push({
            field,
            message: `${field} format is invalid`,
            value: sanitizedValue,
            constraint: 'pattern',
          });
        }
      }

      // Range validation for numbers
      if (rule.type === 'number') {
        if (
          rule.min !== undefined &&
          typeof sanitizedValue === 'number' &&
          sanitizedValue < rule.min
        ) {
          errors.push({
            field,
            message: `${field} must be at least ${rule.min}`,
            value: sanitizedValue,
            constraint: 'min',
          });
        }

        if (
          rule.max !== undefined &&
          typeof sanitizedValue === 'number' &&
          sanitizedValue > rule.max
        ) {
          errors.push({
            field,
            message: `${field} must not exceed ${rule.max}`,
            value: sanitizedValue,
            constraint: 'max',
          });
        }
      }

      // Enum validation
      if (
        rule.enum &&
        !rule.enum.includes(sanitizedValue as string | number | boolean)
      ) {
        errors.push({
          field,
          message: `${field} must be one of: ${rule.enum.join(', ')}`,
          value: sanitizedValue,
          constraint: 'enum',
        });
      }

      // Custom validation
      if (rule.custom) {
        const customResult = rule.custom(sanitizedValue, originalData);
        if (customResult !== true) {
          errors.push({
            field,
            message:
              typeof customResult === 'string'
                ? customResult
                : `${field} is invalid`,
            value: sanitizedValue,
            constraint: 'custom',
          });
        }
      }

      return {
        isValid: errors.length === 0,
        value: sanitizedValue,
        errors: errors.length > 0 ? errors : undefined,
      };
    } catch (error) {
      logger.error(`Field validation error for ${field}`, error as Error, {
        ...this.context,
        field,
        value:
          typeof value === 'string' ? value.substring(0, 100) : String(value),
      });

      return {
        isValid: false,
        errors: [
          {
            field,
            message: `${field} validation failed`,
            constraint: 'validation_error',
          },
        ],
      };
    }
  }

  /**
   * Validate field type
   */
  private validateType(
    field: string,
    value: unknown,
    rule: ValidationRule
  ): ValidationError | null {
    switch (rule.type) {
      case 'string':
        if (typeof value !== 'string') {
          return {
            field,
            message: `${field} must be a string`,
            value,
            constraint: 'type',
          };
        }
        break;

      case 'number':
        if (typeof value !== 'number' || isNaN(value)) {
          return {
            field,
            message: `${field} must be a number`,
            value,
            constraint: 'type',
          };
        }
        break;

      case 'boolean':
        if (typeof value !== 'boolean') {
          return {
            field,
            message: `${field} must be a boolean`,
            value,
            constraint: 'type',
          };
        }
        break;

      case 'array':
        if (!Array.isArray(value)) {
          return {
            field,
            message: `${field} must be an array`,
            value,
            constraint: 'type',
          };
        }
        break;

      case 'object':
        if (
          typeof value !== 'object' ||
          Array.isArray(value) ||
          value === null
        ) {
          return {
            field,
            message: `${field} must be an object`,
            value,
            constraint: 'type',
          };
        }
        break;

      case 'email': {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (typeof value !== 'string' || !emailRegex.test(value)) {
          return {
            field,
            message: `${field} must be a valid email address`,
            value,
            constraint: 'email',
          };
        }
        break;
      }

      case 'uuid': {
        const uuidRegex =
          /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        if (typeof value !== 'string' || !uuidRegex.test(value)) {
          return {
            field,
            message: `${field} must be a valid UUID`,
            value,
            constraint: 'uuid',
          };
        }
        break;
      }

      case 'url':
        try {
          if (typeof value !== 'string') {
            throw new Error('Not a string');
          }
          new URL(value);
        } catch {
          return {
            field,
            message: `${field} must be a valid URL`,
            value,
            constraint: 'url',
          };
        }
        break;

      default:
        return {
          field,
          message: `${field} has unknown validation type: ${rule.type}`,
          value,
          constraint: 'unknown_type',
        };
    }

    return null;
  }

  /**
   * Basic sanitization for string values
   */
  private sanitizeValue(value: string): string {
    return (
      value
        .trim()
        // Remove potential script content
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        // Remove potential iframe content
        .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
        // Remove javascript: protocols
        .replace(/javascript:/gi, '')
        // Remove event handlers
        .replace(/on\w+\s*=/gi, '')
    );
  }
}

/**
 * Validation middleware for API routes
 */
export function validateRequest(
  schema: ValidationSchema,
  options: {
    sanitize?: boolean;
    strict?: boolean;
    source?: 'body' | 'query' | 'both';
  } = {}
) {
  return function <T extends APIRoute>(handler: T): T {
    return (async context => {
      const { request } = context;
      const requestId = generateRequestId();

      // Extract validation context
      const validationContext: ValidationContext = {
        requestId,
        endpoint: request.url,
        method: request.method,
        ip:
          request.headers.get('x-forwarded-for')?.split(',')[0] ||
          request.headers.get('x-real-ip') ||
          'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
      };

      try {
        // Parse request data based on source
        let data: Record<string, unknown> = {};
        const source = options.source || 'body';
        const contentType = request.headers.get('content-type');

        if (source === 'body' || source === 'both') {
          if (contentType?.includes('application/json')) {
            const bodyData = await request.json();
            data = { ...data, ...bodyData };
          } else if (
            contentType?.includes('application/x-www-form-urlencoded') ||
            contentType?.includes('multipart/form-data')
          ) {
            const formData = await request.formData();
            const formDataObj = Object.fromEntries(formData.entries());
            data = { ...data, ...formDataObj };
          }
        }

        if (source === 'query' || source === 'both') {
          const url = new URL(request.url);
          const queryParams = Object.fromEntries(url.searchParams.entries());
          data = { ...data, ...queryParams };
        }

        if (source === 'both' && Object.keys(data).length === 0) {
          data = {};
        }

        // Validate data
        const validator = new ValidationEngine(validationContext);
        const result = validator.validate(data, schema);

        if (!result.isValid) {
          // Log validation failure
          logger.warn('Request validation failed', {
            ...validationContext,
            errorCount: result.errors?.length || 0,
          });

          // Return validation error response
          return new Response(
            JSON.stringify({
              success: false,
              error: {
                code: 'VALIDATION_FAILED',
                message: 'Request validation failed',
                details: result.errors,
                requestId,
                timestamp: new Date().toISOString(),
              },
            }),
            {
              status: 400,
              headers: {
                'Content-Type': 'application/json',
                'X-Request-ID': requestId || 'unknown',
              },
            }
          );
        }

        // Add validated data to context
        const enhancedContext = {
          ...context,
          validatedData: result.data,
          requestId: requestId || 'unknown',
        };

        // Continue with original handler
        return await handler(enhancedContext);
      } catch (error) {
        logger.error(
          'Validation middleware error',
          error as Error,
          validationContext
        );

        return new Response(
          JSON.stringify({
            success: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Request validation error',
              requestId,
              timestamp: new Date().toISOString(),
            },
          }),
          {
            status: 500,
            headers: {
              'Content-Type': 'application/json',
              'X-Request-ID': requestId || 'unknown',
            },
          }
        );
      }
    }) as T;
  };
}

/**
 * Generate unique request ID
 */
export function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Common validation schemas
 */
export const CommonSchemas = {
  // UUID validation
  uuid: {
    type: 'uuid' as const,
    required: true,
  },

  // Email validation
  email: {
    type: 'email' as const,
    required: true,
    maxLength: 255,
  },

  // Optional email
  optionalEmail: {
    type: 'email' as const,
    required: false,
    maxLength: 255,
  },

  // Positive amount (for payments)
  positiveAmount: {
    type: 'number' as const,
    required: true,
    min: 0.01,
    max: 999999999.99,
  },

  // Pagination
  pagination: {
    limit: {
      type: 'number' as const,
      required: false,
      min: 1,
      max: 100,
    },
    offset: {
      type: 'number' as const,
      required: false,
      min: 0,
    },
  },

  // Date range
  dateRange: {
    startDate: {
      type: 'string' as const,
      required: false,
      pattern: /^\d{4}-\d{2}-\d{2}$/,
    },
    endDate: {
      type: 'string' as const,
      required: false,
      pattern: /^\d{4}-\d{2}-\d{2}$/,
    },
  },
};

/**
 * Helper function to create headers with request ID
 */
export function createHeaders(
  requestId?: string,
  additionalHeaders: Record<string, string> = {}
): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    'X-Request-ID': requestId || 'unknown',
    ...additionalHeaders,
  };
}

export default ValidationEngine;
