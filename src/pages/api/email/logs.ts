import { json } from '@astrojs/cloudflare';
import type { APIRoute } from 'astro';
import { emailService } from '@/lib/email';

export const GET: APIRoute = async ({ url }) => {
  try {
    const emailId = url.searchParams.get('emailId');
    
    if (!emailId) {
      return json(
        { error: 'Missing emailId parameter' },
        { status: 400 }
      );
    }

    const queueService = emailService.getQueueService();
    const logs = await queueService.getDeliveryLogs(emailId);

    return json({
      success: true,
      data: logs
    });
  } catch (error) {
    console.error('Error fetching delivery logs:', error);
    return json(
      { error: 'Failed to fetch delivery logs' },
      { status: 500 }
    );
  }
};