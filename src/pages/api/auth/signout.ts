import type { APIRoute } from 'astro';
import { createServerClient } from '../../../lib/supabase';
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

    const supabase = createServerClient();

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
    const errorMessage =
      error instanceof Error ? error.message : 'Sign out failed';
    const sanitizedError = sanitizeString(errorMessage);
    return new Response(sanitizedError, {
      status: 500,
      headers: { 'X-Content-Type-Options': 'nosniff' },
    });
  }
};
