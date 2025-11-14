import { createClient } from "@supabase/supabase-js";

export const supabase = typeof window !== 'undefined' ? createClient(
  import.meta.env.SUPABASE_URL,
  import.meta.env.SUPABASE_ANON_KEY,
) : null;