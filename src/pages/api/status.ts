import type { APIRoute } from "astro";
import { getStatusData } from "../../lib/status";

export const prerender = false;

// GET endpoint to fetch status data
export const GET: APIRoute = async () => {
  try {
    const statusData = await getStatusData();
    
    return new Response(JSON.stringify(statusData), {
      headers: { 
        "Content-Type": "application/json",
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "Pragma": "no-cache",
        "Expires": "0"
      }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
};