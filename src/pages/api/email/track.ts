import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';

export const GET: APIRoute = async ({ request, url }) => {
  try {
    const emailId = url.searchParams.get('email');
    const customerId = url.searchParams.get('customer');
    const campaignId = url.searchParams.get('campaign');

    if (!emailId) {
      // Return 1x1 transparent pixel anyway to avoid broken images
      return new Response(
        Buffer.from(
          'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
          'base64'
        ),
        {
          status: 200,
          headers: {
            'Content-Type': 'image/png',
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0',
          },
        }
      );
    }

    const supabase = createClient(
      import.meta.env.SUPABASE_URL,
      import.meta.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // Get user agent and IP address
    const userAgent = request.headers.get('user-agent') || undefined;
    const clientIP = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     '127.0.0.1';

    // Track the open event
    await supabase
      .from('email_analytics')
      .insert({
        email_id: emailId,
        campaign_id: campaignId || null,
        customer_id: customerId || null,
        event_type: 'opened',
        event_data: {
          userAgent,
          trackedAt: new Date().toISOString(),
        },
        user_agent: userAgent,
        ip_address: clientIP,
      });

    // Update campaign recipient status if applicable
    if (campaignId) {
      await supabase
        .from('email_campaign_recipients')
        .update({
          status: 'opened',
          opened_at: new Date().toISOString(),
        })
        .eq('campaign_id', campaignId)
        .eq('email_id', emailId);
    }

    // Return 1x1 transparent pixel
    return new Response(
      Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
        'base64'
      ),
      {
        status: 200,
        headers: {
          'Content-Type': 'image/png',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        },
      }
    );
  } catch (error) {
    console.error('Error tracking email open:', error);
    // Still return the pixel to avoid broken images
    return new Response(
      Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
        'base64'
      ),
      {
        status: 200,
        headers: {
          'Content-Type': 'image/png',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        },
      }
    );
  }
};