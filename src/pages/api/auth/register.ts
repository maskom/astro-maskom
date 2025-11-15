import type { APIRoute } from "astro";
import { createClient } from "@supabase/supabase-js";
import { sanitizeInput, sanitizeEmail } from "../../../lib/sanitization";

export const prerender = false;
export const POST: APIRoute = async ({ request, redirect }) => {
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

  // Basic password validation
  if (password.length < 8) {
    return new Response("Password must be at least 8 characters", { status: 400 });
  }

  const supabase = createClient(
    import.meta.env.SUPABASE_URL,
    import.meta.env.SUPABASE_ANON_KEY
  );

  const { error } = await supabase.auth.signUp({
    email: sanitizedEmail,
    password,
  });

  if (error) {
    return new Response("Registration failed", { status: 400 });
  }

  return redirect("/signin");
  } catch (error) {
    console.error('Register error:', error);
    return new Response("An error occurred during registration", { status: 500 });
  }
};
