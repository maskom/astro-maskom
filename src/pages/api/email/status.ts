import type { APIRoute } from 'astro';
import { emailService } from '../../../lib/email';

export const GET: APIRoute = async () => {
  try {
    const result = await emailService.testConnection();

    return new Response(JSON.stringify({
      success: true,
      data: {
        provider: emailService.getProviderName(),
        configuration: emailService.getConfiguration(),
        validation: emailService.validateConfiguration(),
        connection: result,
      },
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    });

  } catch (error) {
    console.error('Email status error:', error);
    
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }
};