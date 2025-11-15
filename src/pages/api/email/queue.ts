import { json } from '@astrojs/cloudflare';
import type { APIRoute } from 'astro';
import { emailService } from '@/lib/email';

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { batchSize } = body;

    const result = await emailService.processQueue();

    return json({
      success: true,
      ...result,
      message: `Processed ${result.processed + result.failed} emails`
    });
  } catch (error) {
    console.error('Error processing queue:', error);
    return json(
      { error: 'Failed to process queue' },
      { status: 500 }
    );
  }
};

export const GET: APIRoute = async () => {
  try {
    const stats = await emailService.getQueueStats();

    return json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error fetching queue stats:', error);
    return json(
      { error: 'Failed to fetch queue stats' },
      { status: 500 }
    );
  }
};