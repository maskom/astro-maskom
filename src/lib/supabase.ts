import { createClient } from '@supabase/supabase-js';

// Client-side Supabase instance for browser
export const supabase =
  typeof window !== 'undefined'
    ? createClient(
        import.meta.env.SUPABASE_URL,
        import.meta.env.SUPABASE_ANON_KEY || import.meta.env.SUPABASE_KEY
      )
    : null;

// Server-side Supabase instance for API routes
export function createServerClient() {
  const supabaseUrl = process.env.SUPABASE_URL || import.meta.env.SUPABASE_URL;
  const supabaseKey =
    process.env.SUPABASE_ANON_KEY ||
    process.env.SUPABASE_KEY ||
    import.meta.env.SUPABASE_ANON_KEY ||
    import.meta.env.SUPABASE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error(
      'Missing Supabase configuration: SUPABASE_URL and SUPABASE_ANON_KEY (or SUPABASE_KEY) must be set'
    );
  }

  return createClient(supabaseUrl, supabaseKey);
}

// Server-side Supabase client with service role for admin operations
export function createServiceClient() {
  const supabaseUrl = process.env.SUPABASE_URL || import.meta.env.SUPABASE_URL;
  const serviceKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    import.meta.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    throw new Error(
      'Missing Supabase service configuration: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set'
    );
  }

  return createClient(supabaseUrl, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
