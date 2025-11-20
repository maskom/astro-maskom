import type { APIRoute } from 'astro';
import { emailService } from '@/lib/email';

export const GET: APIRoute = async ({ url }) => {
  try {
    const emailId = url.searchParams.get('emailId');

    if (!emailId) {
      return new Response(
        JSON.stringify({ error: 'Missing emailId parameter' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const queueService = emailService.getQueueService();
    const logs = await queueService.getDeliveryLogs(emailId);

    return new Response(
      JSON.stringify({
        success: true,
        data: logs,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error fetching delivery logs:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to fetch delivery logs' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
