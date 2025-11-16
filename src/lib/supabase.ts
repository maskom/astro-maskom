import { createClient } from '@supabase/supabase-js';

// Client-side Supabase instance for browser
export const supabase =
  typeof window !== 'undefined'
    ? createClient(
        import.meta.env.SUPABASE_URL,
        import.meta.env.SUPABASE_ANON_KEY
      )
    : null;

// Server-side Supabase instance for API routes
export function createServerClient() {
  return createClient(
    process.env.SUPABASE_URL || '',
    process.env.SUPABASE_ANON_KEY || ''
  );
}
