import type { APIRoute } from "astro";
import { createClient } from "@supabase/supabase-js";
import { sanitizeEmail, sanitizeString } from "../../../lib/sanitization";

export const prerender = false;
export const POST: APIRoute = async ({ request, redirect }) => {
  try {
    const formData = await request.formData();
    const email = formData.get("email")?.toString();
    const password = formData.get("password")?.toString();

    if (!email || !password) {
      return new Response("Email and password are required", { 
        status: 400,
        headers: { "X-Content-Type-Options": "nosniff" }
      });
    }

    // Sanitize email
    const sanitizedEmail = sanitizeEmail(email);
    if (!sanitizedEmail) {
      return new Response("Valid email is required", { 
        status: 400,
        headers: { "X-Content-Type-Options": "nosniff" }
      });
    }

    const supabase = createClient(
      import.meta.env.SUPABASE_URL,
      import.meta.env.SUPABASE_ANON_KEY,
    );

    const { error } = await supabase.auth.signUp({
      email: sanitizedEmail,
      password,
    });

    if (error) {
      const sanitizedError = sanitizeString(error.message);
      return new Response(sanitizedError, { 
        status: 500,
        headers: { "X-Content-Type-Options": "nosniff" }
      });
    }

    return redirect("/signin");
  } catch (error) {
    const sanitizedError = sanitizeString(error?.message || 'Registration failed');
    return new Response(sanitizedError, { 
      status: 500,
      headers: { "X-Content-Type-Options": "nosniff" }
    });
  }
};