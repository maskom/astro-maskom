// With `output: 'static'` configured:
// export const prerender = false;
import type { APIRoute } from "astro";
import { supabase } from "../../../lib/supabase";

export const GET: APIRoute = async ({ cookies, redirect }) => {
  cookies.delete("sb-access-token", {
    path: "/",
  });
  cookies.delete("sb-refresh-token", {
    path: "/",
  });
  
  const { error } = await supabase.auth.signOut();
  
  if (error) {
    return new Response(error.message, { status: 500 });
  }
  
  return redirect("/signin");
};