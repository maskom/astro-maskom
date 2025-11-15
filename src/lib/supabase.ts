import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

export const supabase: SupabaseClient<Database> | null =
  typeof window !== 'undefined'
    ? createClient<Database>(
        import.meta.env.SUPABASE_URL,
        import.meta.env.SUPABASE_ANON_KEY
      )
    : null;

export function createSupabaseClient(
  supabaseUrl: string,
  supabaseKey: string
): SupabaseClient<Database> {
  return createClient<Database>(supabaseUrl, supabaseKey);
}
