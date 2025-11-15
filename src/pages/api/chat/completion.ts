import type { APIRoute } from "astro";
import OpenAI from "openai";
import { packages as hardcodedPackages } from "../../../data/packages";
import { validateRequestBody, sanitizeString } from "../../../lib/sanitization";

export const prerender = false;
export const POST: APIRoute = async ({ request }) => {
  try {
    const requestData = await request.json();
    
    // Validate and sanitize input
    const validation = validateRequestBody(requestData, ['messages']);
    
    if (!validation.isValid) {
      return new Response(JSON.stringify({ 
        error: "Validation failed", 
        details: validation.errors 
      }), {
        status: 400,
        headers: { 
          "Content-Type": "application/json",
          "X-Content-Type-Options": "nosniff"
        }
      });
    }
    
    const { messages } = validation.sanitized;
    
    // Sanitize message content
    const sanitizedMessages = messages.map((msg: any) => ({
      role: msg.role,
      content: sanitizeString(msg.content)
    }));
    
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
    
    const response = sanitizeString(completion.choices[0].message.content || '');
    
    return new Response(JSON.stringify({ response }), {
      headers: { 
        "Content-Type": "application/json",
        "X-Content-Type-Options": "nosniff"
      }
    });
  } catch (error: any) {
    const sanitizedError = sanitizeString(error?.message || 'Unknown error');
    return new Response(JSON.stringify({ error: sanitizedError }), {
      status: 500,
      headers: { 
        "Content-Type": "application/json",
        "X-Content-Type-Options": "nosniff"
      }
    });
  }
};