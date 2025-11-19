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

    // Check if user has admin role (you might want to implement proper role checking)
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
    const status = url.searchParams.get('status');
    const type = url.searchParams.get('type');
    const limit = parseInt(url.searchParams.get('limit') || '20');
    const offset = parseInt(url.searchParams.get('offset') || '0');

    let query = supabase
      .from('email_campaigns')
      .select('*')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (status) {
      query = query.eq('status', status);
    }

    if (type) {
      query = query.eq('campaign_type', type);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to get campaigns: ${error.message}`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: data || [],
        pagination: {
          limit,
          offset,
          count: data?.length || 0,
        },
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error getting campaigns:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to get campaigns' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

export const POST: APIRoute = async ({ request }) => {
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

    const body = await request.json();
    const {
      name,
      description,
      subject,
      contentHtml,
      contentText,
      campaignType,
      targetAudience,
      scheduledAt,
    } = body;

    // Validate required fields
    if (!name || !subject || !contentHtml) {
      return new Response(
        JSON.stringify({ 
          error: 'Missing required fields: name, subject, contentHtml' 
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Validate campaign type
    const validTypes = ['marketing', 'newsletter', 'promotional', 'announcement'];
    if (campaignType && !validTypes.includes(campaignType)) {
      return new Response(
        JSON.stringify({ error: 'Invalid campaign type' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Create campaign
    const { data, error } = await supabase.rpc('create_email_campaign', {
      p_name: name,
      p_description: description || null,
      p_subject: subject,
      p_content_html: contentHtml,
      p_content_text: contentText || null,
      p_campaign_type: campaignType || 'marketing',
      p_target_audience: targetAudience || {},
      p_scheduled_at: scheduledAt ? new Date(scheduledAt).toISOString() : null,
      p_created_by: user.id,
    });

    if (error) {
      throw new Error(`Failed to create campaign: ${error.message}`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        campaignId: data,
        message: 'Campaign created successfully',
      }),
      { status: 201, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error creating campaign:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to create campaign' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};