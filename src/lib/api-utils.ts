import { supabase } from './supabase.ts';
import { logger } from './logger.ts';

export interface APIContext {
  request: Request;
  params?: Record<string, string>;
}

export interface AuthenticatedUser {
  id: string;
  email: string;
  phone?: string;
}

export async function authenticateRequest(
  request: Request
): Promise<AuthenticatedUser | null> {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }

    const token = authHeader.split(' ')[1];
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
    logger.error('Authentication error', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return null;
  }
}

export function createErrorResponse(message: string, status: number = 500) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export function createSuccessResponse<T>(
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

export function logError(context: string, userId: string, error: unknown) {
  const errorMessage = error instanceof Error ? error.message : 'Unknown error';
  logger.error(context, { userId, error: errorMessage });
}
