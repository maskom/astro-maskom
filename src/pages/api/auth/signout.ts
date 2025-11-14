import type { APIRoute } from "astro";
import { createClient } from "@supabase/supabase-js";

export const prerender = false;
export const GET: APIRoute = async ({ cookies, redirect }) => {
  cookies.delete("sb-access-token", {
    path: "/",
  });
  cookies.delete("sb-refresh-token", {
    path: "/",
  });
  
  const supabase = createClient(
    import.meta.env.SUPABASE_URL,
    import.meta.env.SUPABASE_ANON_KEY,
  );
  
  const { error } = await supabase.auth.signOut();
  
  if (error) {
    return new Response(error.message, { status: 500 });
  }
  
  return redirect("/signin");
};