import type { APIRoute } from 'astro';

export const GET: APIRoute = async () => {
  const timestamp = new Date().toISOString();

  // Very simple test without any environment validation
  const testResponse = {
    timestamp,
    message: 'Simple test endpoint working',
    mode: import.meta.env.MODE,
    envVarsAvailable: {
      SUPABASE_URL: !!import.meta.env.SUPABASE_URL,
      SUPABASE_KEY: !!import.meta.env.SUPABASE_KEY,
    },
  };

  const headers = new Headers({
    'Content-Type': 'application/json',
    'Cache-Control': 'no-cache',
  });

  return new Response(JSON.stringify(testResponse, null, 2), {
    status: 200,
    headers,
  });
};
