import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { email, reason, token } = body;

    // Validate required fields
    if (!email) {
      return new Response(
        JSON.stringify({ error: 'Email is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return new Response(
        JSON.stringify({ error: 'Invalid email address' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      import.meta.env.SUPABASE_URL,
      import.meta.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // If token is provided, verify it's a valid unsubscribe token
    let customerId = null;
    if (token) {
      const { data: unsubscribeData } = await supabase
        .from('email_unsubscribes')
        .select('customer_id')
        .eq('unsubscribe_token', token)
        .single();

      if (unsubscribeData) {
        customerId = unsubscribeData.customer_id;
      }
    } else {
      // Try to find customer by email
      const { data: profileData } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', email)
        .single();

      if (profileData) {
        customerId = profileData.id;
      }
    }

    // Generate unsubscribe token if not provided
    const unsubscribeToken = token || crypto.randomUUID();

    // Add to unsubscribe list
    const { error } = await supabase
      .from('email_unsubscribes')
      .insert({
        email,
        customer_id: customerId,
        reason: reason || 'User requested unsubscribe',
        unsubscribe_token: unsubscribeToken,
      });

    if (error) {
      // Handle duplicate email
      if (error.code === '23505') {
        return new Response(
          JSON.stringify({
            success: true,
            message: 'Email is already unsubscribed',
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }
      throw new Error(`Failed to unsubscribe: ${error.message}`);
    }

    // Update customer preferences if customer exists
    if (customerId) {
      await supabase.rpc('update_customer_email_preferences', {
        p_customer_id: customerId,
        p_email_enabled: false,
        p_transactional_emails: false,
        p_marketing_emails: false,
        p_newsletter_emails: false,
        p_billing_notifications: false,
        p_service_notifications: false,
        p_appointment_reminders: false,
        p_promotional_emails: false,
        p_security_notifications: false,
        p_frequency_preference: 'never',
        p_preferred_language: 'id',
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Successfully unsubscribed from all emails',
        unsubscribeToken,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error unsubscribing:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to unsubscribe' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

export const GET: APIRoute = async ({ url }) => {
  try {
    const token = url.searchParams.get('token');
    
    if (!token) {
      return new Response(
        JSON.stringify({ error: 'Unsubscribe token is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      import.meta.env.SUPABASE_URL,
      import.meta.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // Get unsubscribe info
    const { data, error } = await supabase
      .from('email_unsubscribes')
      .select('*')
      .eq('unsubscribe_token', token)
      .single();

    if (error || !data) {
      return new Response(
        JSON.stringify({ error: 'Invalid unsubscribe token' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          email: data.email,
          unsubscribedAt: data.created_at,
          reason: data.reason,
        },
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error getting unsubscribe info:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to get unsubscribe info' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};