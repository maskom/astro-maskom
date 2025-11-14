import type { APIRoute } from "astro";
import { createClient } from "@supabase/supabase-js";

// Initialize Supabase client for server-side operations
const supabase = createClient(
  import.meta.env.SUPABASE_URL,
  import.meta.env.SUPABASE_SERVICE_ROLE_KEY // Service role key for server-side operations
);

export const prerender = false;

// GET endpoint to fetch subscribers
export const GET: APIRoute = async () => {
  try {
    // In a real implementation, you would fetch subscribers from a database
    // For now, we'll return an empty array
    const subscribers = [];
    
    return new Response(JSON.stringify(subscribers), {
      headers: { 
        "Content-Type": "application/json",
        "Cache-Control": "no-cache"
      }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
};

// POST endpoint to add a new subscriber
export const POST: APIRoute = async ({ request }) => {
  try {
    const { email, preferences } = await request.json();
    
    // Validate email
    if (!email || !email.includes('@')) {
      return new Response(JSON.stringify({ error: "Valid email is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }
    
    // In a real implementation, you would:
    // 1. Check if email already exists in database
    // 2. Insert new subscriber into database
    // 3. Send confirmation email
    
    // For now, we'll just simulate the process
    const newSubscriber = {
      id: Math.random().toString(36).substring(2, 9),
      email,
      preferences: preferences || {
        incidents: true,
        maintenance: true,
        statusChanges: true
      },
      subscribed_at: new Date().toISOString(),
      confirmed: false // Would be set to true after email confirmation
    };
    
    // Simulate database operation
    await new Promise(resolve => setTimeout(resolve, 500));
    
    return new Response(JSON.stringify(newSubscriber), {
      headers: { "Content-Type": "application/json" }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
};