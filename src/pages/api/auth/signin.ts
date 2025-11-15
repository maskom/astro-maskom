import type { APIRoute } from "astro";
import { createClient } from "@supabase/supabase-js";
import { sanitizeInput } from "../../../lib/sanitization";

export const prerender = false;
export const POST: APIRoute = async ({ request, cookies, redirect }) => {
  try {
    const formData = await request.formData();
    const email = sanitizeInput(formData.get("email")?.toString());
    const password = formData.get("password")?.toString(); // Don't sanitize password

  // Validate and sanitize email
  const sanitizedEmail = sanitizeEmail(email || "");
  
  if (!sanitizedEmail || !password) {
    return new Response("Email and password are required", { status: 400 });
  }

  // Basic email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return new Response("Invalid email format", { status: 400 });
  }

  const supabase = createClient(
    import.meta.env.SUPABASE_URL,
    import.meta.env.SUPABASE_ANON_KEY,
  );

  const { data, error } = await supabase.auth.signInWithPassword({
    email: sanitizedEmail,
    password,
  });

  if (error) {
    return new Response("Invalid credentials", { status: 401 });
  }

  const { access_token, refresh_token } = data.session;
  cookies.set("sb-access-token", access_token, {
    path: "/",
    secure: true,
    httpOnly: true,
    sameSite: 'strict'
  });
  cookies.set("sb-refresh-token", refresh_token, {
    path: "/",
    secure: true,
    httpOnly: true,
    sameSite: 'strict'
  });
  return redirect("/dashboard");
  } catch (error) {
    console.error('Signin error:', error);
    return new Response("An error occurred during sign in", { status: 500 });
  }
};