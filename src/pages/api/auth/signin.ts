import type { APIRoute } from "astro";
import { createClient } from "@supabase/supabase-js";
import { sanitizeEmail, sanitizeText } from "../../../lib/sanitization";

export const prerender = false;
export const POST: APIRoute = async ({ request, cookies, redirect }) => {
  const formData = await request.formData();
  const rawEmail = formData.get("email")?.toString();
  const rawPassword = formData.get("password")?.toString();

  // Sanitize inputs
  const email = sanitizeEmail(rawEmail || '');
  const password = sanitizeText(rawPassword || '');

  if (!email || !password) {
    return new Response("Email and password are required", { status: 400 });
  }

  const supabase = createClient(
    import.meta.env.SUPABASE_URL,
    import.meta.env.SUPABASE_ANON_KEY,
  );

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return new Response(error.message, { status: 500 });
  }

  const { access_token, refresh_token } = data.session;
  cookies.set("sb-access-token", access_token, {
    path: "/",
  });
  cookies.set("sb-refresh-token", refresh_token, {
    path: "/",
  });
  return redirect("/dashboard");
};