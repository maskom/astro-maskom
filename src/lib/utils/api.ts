import { createClient, SupabaseClient, type User } from '@supabase/supabase-js';
import { ErrorFactory } from '../errors';
import { getRequestContext } from '../middleware/api';
import { logger } from '../logger';

/**
 * Common API utilities and helpers
 */

export interface APIContext {
  request: Request;
  params?: Record<string, string>;
}

export interface AuthenticatedUser {
  id: string;
  email: string;
  phone?: string;
}

export interface AuthResult {
  user: User;
  token: string;
}

export interface AdminAuthResult extends AuthResult {
  isAdmin: boolean;
}

/**
 * Creates a Supabase client with service role key
 */
export function createServiceClient(): SupabaseClient {
  return createClient(
    import.meta.env.SUPABASE_URL,
    import.meta.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

/**
 * Legacy authentication function for backward compatibility
 * Use authenticateUser for new code
 */
export async function authenticateRequest(
  request: Request
): Promise<AuthenticatedUser | null> {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }

    const token = authHeader.split(' ')[1];
    const supabase = createServiceClient();

    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(token);

    if (error || !user) {
      return null;
    }

    return {
      id: user.id,
      email: user.email || '',
      phone: user.phone || undefined,
    };
  } catch (error) {
    logger.error(
      'Authentication error',
      error instanceof Error ? error : new Error('Unknown authentication error')
    );
    return null;
  }
}

/**
 * Validates Bearer token and returns user information
 */
export async function authenticateUser(request: Request): Promise<AuthResult> {
  const context = getRequestContext(request);

  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    throw ErrorFactory.unauthorized(context.requestId);
  }

  const token = authHeader.substring(7);
  const supabase = createServiceClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token);

  if (error || !user) {
    throw ErrorFactory.invalidToken(context.requestId);
  }

  return { user, token };
}

/**
 * Validates Bearer token and checks if user is admin
 */
export async function authenticateAdmin(
  request: Request
): Promise<AdminAuthResult> {
  const context = getRequestContext(request);
  const authResult = await authenticateUser(request);

  // Check if user is admin (you may need to adjust this based on your user schema)
  const supabase = createServiceClient();
  const { data: profile, error } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', authResult.user.id)
    .single();

  if (error || !profile || profile.role !== 'admin') {
    throw ErrorFactory.adminRequired(context.requestId);
  }

  return { ...authResult, isAdmin: true };
}

/**
 * Validates required query parameters
 */
export function validateQueryParams(
  url: string,
  requiredParams: string[],
  requestId?: string
): Record<string, string> {
  const searchParams = new URL(url).searchParams;
  const params: Record<string, string> = {};
  const missing: string[] = [];

  for (const param of requiredParams) {
    const value = searchParams.get(param);
    if (!value) {
      missing.push(param);
    } else {
      params[param] = value;
    }
  }

  if (missing.length > 0) {
    throw ErrorFactory.missingRequiredField(missing.join(', '), requestId);
  }

  return params;
}

/**
 * Validates optional query parameters with defaults
 */
export function getQueryParams(
  url: string,
  paramDefs: Record<
    string,
    { default?: string; type?: 'string' | 'number' | 'boolean' }
  >
): Record<string, string | number | boolean | undefined> {
  const searchParams = new URL(url).searchParams;
  const params: Record<string, string | number | boolean | undefined> = {};

  for (const [key, config] of Object.entries(paramDefs)) {
    const value = searchParams.get(key);

    if (value === null) {
      params[key] = config.default;
      continue;
    }

    switch (config.type) {
      case 'number': {
        const numValue = parseInt(value, 10);
        if (isNaN(numValue)) {
          throw ErrorFactory.validationFailed(
            `Invalid number value for parameter: ${key}`,
            key
          );
        }
        params[key] = numValue;
        break;
      }
      case 'boolean':
        params[key] = value.toLowerCase() === 'true';
        break;
      default:
        params[key] = value;
    }
  }

  return params;
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
 * Standard success response helper
 */
export function createSuccessResponse<T>(
  data: T,
  status: number = 200,
  headers?: Record<string, string>
): Response {
  const defaultHeaders = {
    'Content-Type': 'application/json',
    'X-Content-Type-Options': 'nosniff',
  };

  return new Response(JSON.stringify(data), {
    status,
    headers: { ...defaultHeaders, ...headers },
  });
}

/**
 * Legacy success response helper for backward compatibility
 * Matches the signature from api-utils.ts
 */
export function createSuccessResponseCompat<T>(
  data: T,
  message?: string,
  status: number = 200
) {
  const response: { success: true; data: T; message?: string } = {
    success: true,
    data,
  };
  if (message) {
    response.message = message;
  }

  return new Response(JSON.stringify(response), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

/**
 * Error response helper
 */
export function createErrorResponse(message: string, status: number = 500) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

/**
 * Error logging helper
 */
export function logError(context: string, userId: string, error: unknown) {
  const errorObj = error instanceof Error ? error : new Error('Unknown error');
  logger.error(context, errorObj, { userId });
}

/**
 * Paginated response helper
 */
export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export function createPaginatedResponse<T>(
  data: T[],
  page: number,
  limit: number,
  total: number
): Response {
  const totalPages = Math.ceil(total / limit);
  const pagination = {
    page,
    limit,
    total,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1,
  };

  return createSuccessResponse<PaginatedResponse<T>>({
    data,
    pagination,
  });
}

/**
 * Database error handler
 */
export function handleDatabaseError(
  error: { code?: string; message?: string },
  operation: string,
  requestId?: string
): never {
  logger.error(`Database error during ${operation}`, new Error(error.message || 'Database error'), {
    module: 'utils',
    submodule: 'api',
    operation: 'handleDatabaseError',
    errorCode: error.code,
    requestId
  });

  // You can customize this based on your database error patterns
  if (error.code === 'PGRST116') {
    throw ErrorFactory.resourceNotFound('Resource', requestId);
  }

  if (error.code === '23505') {
    throw ErrorFactory.duplicateResource('Resource', requestId);
  }

  throw ErrorFactory.databaseError(
    `Database operation failed: ${operation}`,
    undefined,
    requestId
  );
}
