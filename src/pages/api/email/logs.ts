import type { APIRoute } from 'astro';
import { emailService } from '../../../lib/email';

export const GET: APIRoute = async ({ request }) => {
  try {
    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get('limit') || '50');

    const logs = emailService.getLogs(limit);

    return new Response(JSON.stringify({
      success: true,
      data: {
        logs,
        total: logs.length,
        provider: emailService.getProviderName(),
      },
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    });

  } catch (error) {
    console.error('Email logs error:', error);
    
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

export const DELETE: APIRoute = async () => {
  try {
    emailService.clearLogs();

    return new Response(JSON.stringify({
      success: true,
      message: 'Email logs cleared successfully',
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    });

  } catch (error) {
    console.error('Email logs clear error:', error);
    
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