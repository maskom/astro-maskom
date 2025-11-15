import type { APIRoute } from "astro";
import OpenAI from "openai";
import { packages as hardcodedPackages } from "../../../data/packages";
import { sanitizeUserInput, validateLength } from "../../../lib/sanitization";

export const prerender = false;
export const POST: APIRoute = async ({ request }) => {
  try {
    const { messages } = await request.json();
    
    // Validate and sanitize input
    if (!Array.isArray(messages) || messages.length === 0) {
      return new Response(JSON.stringify({ error: 'Invalid messages format' }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }
    
    // Sanitize each message
    const sanitizedMessages = messages.map(msg => ({
      role: msg.role === 'user' || msg.role === 'assistant' ? msg.role : 'user',
      content: sanitizeUserInput(msg.content || '')
    })).filter(msg => validateLength(msg.content, 1, 2000));
    
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