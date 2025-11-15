import type { APIRoute } from "astro";
import { createClient } from "@supabase/supabase-js";
import { sanitizeEmail, validateLength } from "../../lib/sanitization";

// Singleton Supabase client for server-side operations
let supabaseClient: ReturnType<typeof createClient> | null = null;

const getSupabaseClient = () => {
  if (!supabaseClient) {
    supabaseClient = createClient(
      import.meta.env.SUPABASE_URL,
      import.meta.env.SUPABASE_SERVICE_ROLE_KEY // Service role key for server-side operations
    );
  }
  return supabaseClient;
};

export const prerender = false;

// GET endpoint to fetch subscribers
export const GET: APIRoute = async () => {
  try {
    const supabase = getSupabaseClient();
    
    // Fetch subscribers from database
    const { data: subscribers, error } = await supabase
      .from('subscribers')
      .select('*')
      .order('subscribed_at', { ascending: false });
    
    if (error) throw error;
    
    return new Response(JSON.stringify(subscribers || []), {
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
    
    // Validate and sanitize email
    const sanitizedEmail = sanitizeEmail(email);
    if (!sanitizedEmail) {
      return new Response(JSON.stringify({ error: "Valid email is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }
    
    const supabase = getSupabaseClient();
    
    // Check if email already exists
    const { data: existingSubscriber, error: checkError } = await supabase
      .from('subscribers')
      .select('id')
      .eq('email', sanitizedEmail)
      .single();
    
    if (checkError && checkError.code !== 'PGRST116') { // PGRST116 is "not found" error
      throw checkError;
    }
    
    if (existingSubscriber) {
      return new Response(JSON.stringify({ error: "Email already subscribed" }), {
        status: 409,
        headers: { "Content-Type": "application/json" }
      });
    }
    
    // Insert new subscriber into database
    const newSubscriber = {
      email: sanitizedEmail,
      preferences: preferences || {
        incidents: true,
        maintenance: true,
        statusChanges: true
      },
      subscribed_at: new Date().toISOString(),
      confirmed: false // Would be set to true after email confirmation
    };
    
    const { data: insertedSubscriber, error: insertError } = await supabase
      .from('subscribers')
      .insert([newSubscriber])
      .select()
      .single();
    
    if (insertError) throw insertError;
    
    // TODO: Send confirmation email (would require email service integration)
    
    return new Response(JSON.stringify(insertedSubscriber), {
      headers: { "Content-Type": "application/json" }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
};