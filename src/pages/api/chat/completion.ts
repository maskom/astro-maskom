import type { APIRoute } from "astro";
import OpenAI from "openai";
import { packages as hardcodedPackages } from "../../../data/packages";
import { sanitizeJsonInput, sanitizeText } from "../../../utils/sanitization";

export const prerender = false;
export const POST: APIRoute = async ({ request }) => {
  const requestData = await request.json();
  
  // Sanitize input data
  const sanitizedData = sanitizeJsonInput(requestData);
  const { messages } = sanitizedData;
  
  // Validate messages array
  if (!Array.isArray(messages) || messages.length === 0) {
    return new Response(JSON.stringify({ error: "Valid messages array is required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" }
    });
  }
  
  // Sanitize each message content
  const sanitizedMessages = messages.map(msg => ({
    role: msg.role,
    content: sanitizeText(msg.content || "")
  })).filter(msg => msg.content.length > 0);
  
  // Create system message with context about packages
  const systemMessage = {
    role: "system",
    content: `You are a helpful customer service assistant for Maskom Network. 
              Here is information about our packages: ${JSON.stringify(hardcodedPackages)}
              Please use this information to answer customer questions accurately.`
  };
  
  // Combine system message with conversation history
  const chatMessages = [systemMessage, ...sanitizedMessages];
  
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