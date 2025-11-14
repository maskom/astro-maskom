import type { APIRoute } from "astro";
import { createClient } from "@supabase/supabase-js";

export const prerender = false;
export const POST: APIRoute = async ({ request, redirect }) => {
  const formData = await request.formData();
  const email = formData.get("email")?.toString();
  const password = formData.get("password")?.toString();

  if (!email || !password) {
    return new Response("Email and password are required", { status: 400 });
  }

  const supabase = createClient(
    import.meta.env.SUPABASE_URL,
    import.meta.env.SUPABASE_ANON_KEY,
  );

  const { error } = await supabase.auth.signUp({
    email,
    password,
  });

  if (error) {
    return new Response(error.message, { status: 500 });
  }

  return redirect("/signin");
};