import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';

export const GET: APIRoute = async ({ request, url }) => {
  try {
    // Verify authentication (service role or admin)
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.split(' ')[1];
    const supabase = createClient(
      import.meta.env.SUPABASE_URL,
      import.meta.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid authentication token' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Check if user has admin role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || !['admin', 'service_role'].includes(profile.role)) {
      return new Response(
        JSON.stringify({ error: 'Insufficient permissions' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Get query parameters
    const campaignId = url.searchParams.get('campaignId');
    const customerId = url.searchParams.get('customerId');
    const eventType = url.searchParams.get('eventType');
    const startDate = url.searchParams.get('startDate');
    const endDate = url.searchParams.get('endDate');
    const limit = parseInt(url.searchParams.get('limit') || '100');
    const offset = parseInt(url.searchParams.get('offset') || '0');

    let query = supabase
      .from('email_analytics')
      .select('*')
      .order('timestamp', { ascending: false })
      .range(offset, offset + limit - 1);

    if (campaignId) {
      query = query.eq('campaign_id', campaignId);
    }

    if (customerId) {
      query = query.eq('customer_id', customerId);
    }

    if (eventType) {
      query = query.eq('event_type', eventType);
    }

    if (startDate) {
      query = query.gte('timestamp', startDate);
    }

    if (endDate) {
      query = query.lte('timestamp', endDate);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to get analytics: ${error.message}`);
    }

    // Get summary statistics
    const { data: summary } = await supabase
      .from('email_analytics')
      .select('event_type')
      .gte('timestamp', startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
      .lte('timestamp', endDate || new Date().toISOString());

    const stats = summary?.reduce((acc: any, item) => {
      acc[item.event_type] = (acc[item.event_type] || 0) + 1;
      return acc;
    }, {}) || {};

    return new Response(
      JSON.stringify({
        success: true,
        data: data || [],
        stats,
        pagination: {
          limit,
          offset,
          count: data?.length || 0,
        },
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error getting analytics:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to get analytics' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { emailId, eventType, eventData } = body;

    // Validate required fields
    if (!emailId || !eventType) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: emailId, eventType' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Validate event type
    const validEventTypes = ['opened', 'clicked', 'bounced', 'complained', 'delivered'];
    if (!validEventTypes.includes(eventType)) {
      return new Response(
        JSON.stringify({ error: 'Invalid event type' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      import.meta.env.SUPABASE_URL,
      import.meta.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // Track the event
    const { error } = await supabase
      .from('email_analytics')
      .insert({
        email_id: emailId,
        event_type: eventType,
        event_data: eventData || {},
        user_agent: eventData?.userAgent,
        ip_address: eventData?.ipAddress,
      });

    if (error) {
      throw new Error(`Failed to track event: ${error.message}`);
    }

    // Update campaign recipient status if applicable
    if (eventType === 'opened' || eventType === 'clicked') {
      const { data: emailData } = await supabase
        .from('email_queue')
        .select('metadata')
        .eq('id', emailId)
        .single();

      if (emailData?.metadata?.campaign_id) {
        const updateField = eventType === 'opened' ? 'opened_at' : 'clicked_at';
        await supabase
          .from('email_campaign_recipients')
          .update({
            status: eventType,
            [updateField]: new Date().toISOString(),
          })
          .eq('campaign_id', emailData.metadata.campaign_id)
          .eq('email_id', emailId);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Event tracked successfully',
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error tracking event:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to track event' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};