import { createClient } from '@supabase/supabase-js';
import { logger } from './logger';
import { getSupabaseConfig, isDevelopment } from './env';

// Client-side Supabase instance for browser
export const supabase =
  typeof window !== 'undefined'
    ? (() => {
        try {
          const config = getSupabaseConfig();
          return createClient(config.url, config.anonKey);
        } catch (error) {
          logger.error(
            'Failed to initialize Supabase client',
            error instanceof Error ? error : new Error(String(error)),
            {
              module: 'supabase',
              operation: 'client-initialization',
            }
          );
          return null;
        }
      })()
    : null;

// Server-side Supabase instance for API routes
export function createServerClient() {
  try {
    // Check environment variables directly first to avoid validation errors
    const supabaseUrl = import.meta.env.SUPABASE_URL;
    const supabaseKey = import.meta.env.SUPABASE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error(
        'Missing Supabase configuration: SUPABASE_URL and SUPABASE_KEY must be set'
      );
    }

    const config = getSupabaseConfig();

    const client = createClient(config.url, config.anonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    return client;
  } catch (error) {
    logger.error(
      'Failed to create Supabase server client',
      error instanceof Error ? error : new Error(String(error)),
      {
        module: 'supabase',
        operation: 'server-client-creation',
      }
    );
    throw error;
  }
}

// Server-side Supabase client with service role for admin operations
export function createServiceClient() {
  try {
    const config = getSupabaseConfig();

    if (!config.url || !config.serviceRoleKey) {
      if (isDevelopment()) {
        logger.warn(
          'Service role key not configured, using anon key for development',
          {
            module: 'supabase',
            operation: 'service-client-creation',
          }
        );
        return createServerClient();
      }

      throw new Error(
        'Missing Supabase service configuration: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set'
      );
    }

    return createClient(config.url, config.serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  } catch (error) {
    logger.error(
      'Failed to create Supabase service client',
      error instanceof Error ? error : new Error(String(error)),
      {
        module: 'supabase',
        operation: 'service-client-creation',
      }
    );
    throw error;
  }
}
