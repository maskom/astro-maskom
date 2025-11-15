import type { APIRoute } from 'astro';
import { emailService } from '@/lib/email';

export const POST: APIRoute = async () => {
  try {
    const result = await emailService.processQueue();

    return new Response(
      JSON.stringify({
        success: true,
        ...result,
        message: `Processed ${result.processed + result.failed} emails`,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error processing queue:', error);
    return new Response(JSON.stringify({ error: 'Failed to process queue' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

export const GET: APIRoute = async () => {
  try {
    const stats = await emailService.getQueueStats();

    return new Response(
      JSON.stringify({
        success: true,
        data: stats,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error fetching queue stats:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to fetch queue stats' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
