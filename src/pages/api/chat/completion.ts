import type { APIRoute } from 'astro';
import OpenAI from 'openai';
import { packages as hardcodedPackages } from '../../../data/packages';
import { validateMessages, sanitizeResponse } from '../../../lib/sanitization';
import { logger } from '../../../lib/logger';

export const prerender = false;
export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { messages } = body;

    // Validate and sanitize input
    const sanitizedMessages = validateMessages(messages);

    if (sanitizedMessages.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Invalid messages format' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Create system message with context about packages
    const systemMessage = {
      role: 'system',
      content: `You are a helpful customer service assistant for Maskom Network. 
              Here is information about our packages: ${JSON.stringify(hardcodedPackages)}
              Please use this information to answer customer questions accurately.`,
    };

    // Combine system message with conversation history
    const chatMessages = [systemMessage, ...sanitizedMessages];

    const openai = new OpenAI({
      apiKey: import.meta.env.OPENAI_API_KEY,
    });

    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: chatMessages,
    });

    const rawResponse = completion.choices[0].message.content || '';
    const sanitizedResponse = sanitizeResponse(rawResponse);

    return new Response(JSON.stringify({ response: sanitizedResponse }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    logger.apiError('Chat completion error', error, {
      action: 'chatCompletion',
      endpoint: '/api/chat/completion',
    });
    return new Response(
      JSON.stringify({
        error: 'An error occurred while processing your request',
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'X-Content-Type-Options': 'nosniff',
        },
      }
    );
  }
};
