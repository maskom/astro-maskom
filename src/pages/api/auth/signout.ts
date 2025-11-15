import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';
import { sanitizeString } from '../../../lib/sanitization';

export const prerender = false;
export const GET: APIRoute = async ({ cookies, redirect }) => {
  try {
    cookies.delete('sb-access-token', {
      path: '/',
    });
    cookies.delete('sb-refresh-token', {
      path: '/',
    });

    const supabase = createClient(
      import.meta.env.SUPABASE_URL,
      import.meta.env.SUPABASE_ANON_KEY
    );

    const { error } = await supabase.auth.signOut();

    if (error) {
      const sanitizedError = sanitizeString(error.message);
      return new Response(sanitizedError, {
        status: 500,
        headers: { 'X-Content-Type-Options': 'nosniff' },
      });
    }

    return redirect('/signin');
  } catch (error) {
    const sanitizedError = sanitizeString(error?.message || 'Sign out failed');
    return new Response(sanitizedError, {
      status: 500,
      headers: { 'X-Content-Type-Options': 'nosniff' },
    });
  }
};
