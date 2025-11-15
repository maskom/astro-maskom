import type { APIRoute } from "astro";
import OpenAI from "openai";
import { packages as hardcodedPackages } from "../../../data/packages";
import { sanitizeText } from "../../../lib/sanitization";

export const prerender = false;
export const POST: APIRoute = async ({ request }) => {
  try {
    const rawData = await request.json();
    
    // Validate and sanitize input
    if (!Array.isArray(rawData.messages)) {
      return new Response(JSON.stringify({ error: "Invalid messages format" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }
    
    // Sanitize messages
    const sanitizedMessages = rawData.messages.map((msg: any) => ({
      role: msg.role === 'user' || msg.role === 'assistant' ? msg.role : 'user',
      content: sanitizeText(msg.content || '')
    })).filter((msg: any) => msg.content);
    
    // Create system message with context about packages
    const systemMessage = {
      role: "system",
      content: `You are a helpful customer service assistant for Maskom Network. 
                Here is information about our packages: ${JSON.stringify(hardcodedPackages)}
                Please use this information to answer customer questions accurately.`
    };
    
    // Combine system message with conversation history
    const chatMessages = [systemMessage, ...sanitizedMessages];
    
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