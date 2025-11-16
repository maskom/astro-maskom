import type { APIRoute } from 'astro';
import { generateRequestId } from '../logger';
import type { ErrorResponse, ErrorDetails } from '../errors';
import { ErrorFactory, ErrorCode } from '../errors';

export interface RequestContext {
  requestId: string;
  method: string;
  url: string;
  ip?: string;
  userAgent?: string;
  userId?: string;
}

/**
 * Middleware to add request ID and context to API requests
 */
export function withRequestContext(handler: APIRoute): APIRoute {
  return async context => {
    const requestId = generateRequestId();
    const request = context.request;

    // Extract client information
    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0] ||
      request.headers.get('x-real-ip') ||
      'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    // Add request context to the request object for downstream handlers
    (request as Request & { requestContext: RequestContext }).requestContext = {
      requestId,
      method: request.method,
      url: request.url,
      ip,
      userAgent,
    } as RequestContext;

    const response = await handler(context);

    // Add request ID to response headers for debugging
    const newResponse = new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: {
        ...response.headers,
        'X-Request-ID': requestId,
      },
    });

    return newResponse;
  };
}

/**
 * Creates a standardized error response
 */
export function createErrorResponse(
  error: unknown,
  requestId?: string
): Response {
  // If it's already one of our custom errors, use it directly
  if (
    error &&
    typeof error === 'object' &&
    'code' in error &&
    'statusCode' in error &&
    'message' in error
  ) {
    const errorObj = error as {
      code: string;
      statusCode: number;
      message: string;
      details?: unknown;
      requestId?: string;
    };

    const errorResponse: ErrorResponse = {
      error: {
        code: errorObj.code as ErrorCode,
        message: errorObj.message,
        details: errorObj.details as ErrorDetails | undefined,
        requestId: requestId || errorObj.requestId,
        timestamp: new Date().toISOString(),
      },
    };

    return new Response(JSON.stringify(errorResponse), {
      status: errorObj.statusCode,
      headers: {
        'Content-Type': 'application/json',
        'X-Request-ID': requestId || errorObj.requestId || '',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  }

  // Handle unknown errors
  const serverError = ErrorFactory.internalError(
    error instanceof Error ? error.message : 'Unknown error occurred',
    undefined,
    requestId
  );

  const errorResponse: ErrorResponse = {
    error: serverError.toJSON(),
  };

  return new Response(JSON.stringify(errorResponse), {
    status: 500,
    headers: {
      'Content-Type': 'application/json',
      'X-Request-ID': requestId || '',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}

/**
 * Error handling wrapper for API routes
 */
export function withErrorHandling(handler: APIRoute): APIRoute {
  return async context => {
    const request = context.request as Request & {
      requestContext?: RequestContext;
    };
    const requestId = request.requestContext?.requestId || generateRequestId();

    try {
      return await handler(context);
    } catch (error) {
      // Log the error with context
      const { logger } = await import('../logger');
      logger.apiError('API request failed', error, {
        requestId,
        method: request.requestContext?.method || 'UNKNOWN',
        url: request.requestContext?.url || 'unknown',
        ip: request.requestContext?.ip,
        userAgent: request.requestContext?.userAgent,
        userId: request.requestContext?.userId,
      });

      return createErrorResponse(error, requestId);
    }
  };
}

/**
 * Combined middleware that adds both request context and error handling
 */
export function withApiMiddleware(handler: APIRoute): APIRoute {
  return withErrorHandling(withRequestContext(handler));
}

/**
 * Helper function to get request context from a request
 */
export function getRequestContext(request: Request): RequestContext {
  return (
    (request as Request & { requestContext?: RequestContext })
      .requestContext || {
      requestId: generateRequestId(),
      method: request.method,
      url: request.url,
    }
  );
}

/**
 * Helper function to add user context to request
 */
export function setUserContext(request: Request, userId: string): void {
  const context = (request as Request & { requestContext?: RequestContext })
    .requestContext;
  if (context) {
    context.userId = userId;
  }
}
