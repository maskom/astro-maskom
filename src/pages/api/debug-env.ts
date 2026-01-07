import type { APIRoute } from 'astro';

export const GET: APIRoute = async () => {
  const timestamp = new Date().toISOString();

  // Simple environment check
  const envCheck = {
    timestamp,
    hasSupabaseUrl: !!import.meta.env.SUPABASE_URL,
    hasSupabaseKey: !!import.meta.env.SUPABASE_KEY,
    supabaseUrlLength: import.meta.env.SUPABASE_URL?.length || 0,
    supabaseKeyLength: import.meta.env.SUPABASE_KEY?.length || 0,
    mode: import.meta.env.MODE,
    allEnvVars: Object.keys(import.meta.env).filter(
      key =>
        key.includes('SUPABASE') ||
        key.includes('CLOUDFLARE') ||
        key.includes('NODE_ENV')
    ),
  };

  const headers = new Headers({
    'Content-Type': 'application/json',
    'Cache-Control': 'no-cache',
  });

  return new Response(JSON.stringify(envCheck, null, 2), {
    status: 200,
    headers,
  });
};
