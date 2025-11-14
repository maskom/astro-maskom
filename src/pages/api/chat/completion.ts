import type { APIRoute } from "astro";
import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";

export const prerender = false;
export const POST: APIRoute = async ({ request }) => {
  const { messages } = await request.json();
  
  // Create Supabase client
  const supabase = createClient(
    import.meta.env.SUPABASE_URL,
    import.meta.env.SUPABASE_ANON_KEY,
  );
  
  // Get relevant data from Supabase
  const { data: packages, error } = await supabase
    .from('packages')
    .select('*');
  
  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
  
  // Create system message with context about packages
  const systemMessage = {
    role: "system",
    content: `You are a helpful customer service assistant for Maskom Network. 
              Here is information about our packages: ${JSON.stringify(packages)}
              Please use this information to answer customer questions accurately.`
  };
  
  // Combine system message with conversation history
  const chatMessages = [systemMessage, ...messages];
  
  try {
    const openai = new OpenAI({
      apiKey: import.meta.env.OPENAI_API_KEY,
    });
    
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: chatMessages,
    });
    
    const response = completion.choices[0].message.content;
    
    return new Response(JSON.stringify({ response }), {
      headers: { "Content-Type": "application/json" }
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error?.message || 'Unknown error' }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
};