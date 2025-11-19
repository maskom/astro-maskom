import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';

export const GET: APIRoute = async ({ request }) => {
  try {
    // Verify authentication
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.split(' ')[1];
    const supabase = createClient(
      import.meta.env.SUPABASE_URL,
      import.meta.env.SUPABASE_ANON_KEY
    );

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid authentication token' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Get customer email preferences
    const { data, error } = await supabase.rpc(
      'get_customer_email_preferences',
      {
        p_customer_id: user.id,
      }
    );

    if (error) {
      throw new Error(`Failed to get preferences: ${error.message}`);
    }

    if (!Array.isArray(data) || data.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          data: {
            customerId: user.id,
            emailEnabled: true,
            transactionalEmails: true,
            marketingEmails: false,
            newsletterEmails: false,
            billingNotifications: true,
            serviceNotifications: true,
            appointmentReminders: true,
            promotionalEmails: false,
            securityNotifications: true,
            frequencyPreference: 'normal',
            preferredLanguage: 'id',
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const prefs = data[0];
    return new Response(
      JSON.stringify({
        success: true,
        data: {
          customerId: user.id,
          emailEnabled: prefs.email_enabled,
          transactionalEmails: prefs.transactional_emails,
          marketingEmails: prefs.marketing_emails,
          newsletterEmails: prefs.newsletter_emails,
          billingNotifications: prefs.billing_notifications,
          serviceNotifications: prefs.service_notifications,
          appointmentReminders: prefs.appointment_reminders,
          promotionalEmails: prefs.promotional_emails,
          securityNotifications: prefs.security_notifications,
          frequencyPreference: prefs.frequency_preference,
          preferredLanguage: prefs.preferred_language,
        },
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error getting email preferences:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to get email preferences' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

export const POST: APIRoute = async ({ request }) => {
  try {
    // Verify authentication
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.split(' ')[1];
    const supabase = createClient(
      import.meta.env.SUPABASE_URL,
      import.meta.env.SUPABASE_ANON_KEY
    );

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid authentication token' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const body = await request.json();
    const {
      emailEnabled,
      transactionalEmails,
      marketingEmails,
      newsletterEmails,
      billingNotifications,
      serviceNotifications,
      appointmentReminders,
      promotionalEmails,
      securityNotifications,
      frequencyPreference,
      preferredLanguage,
    } = body;

    // Validate frequency preference
    const validFrequencies = ['immediate', 'daily', 'weekly', 'never'];
    if (
      frequencyPreference &&
      !validFrequencies.includes(frequencyPreference)
    ) {
      return new Response(
        JSON.stringify({ error: 'Invalid frequency preference' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Validate language preference
    const validLanguages = ['id', 'en'];
    if (preferredLanguage && !validLanguages.includes(preferredLanguage)) {
      return new Response(
        JSON.stringify({ error: 'Invalid language preference' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Update customer email preferences
    const { error } = await supabase.rpc('update_customer_email_preferences', {
      p_customer_id: user.id,
      p_email_enabled: emailEnabled ?? true,
      p_transactional_emails: transactionalEmails ?? true,
      p_marketing_emails: marketingEmails ?? false,
      p_newsletter_emails: newsletterEmails ?? false,
      p_billing_notifications: billingNotifications ?? true,
      p_service_notifications: serviceNotifications ?? true,
      p_appointment_reminders: appointmentReminders ?? true,
      p_promotional_emails: promotionalEmails ?? false,
      p_security_notifications: securityNotifications ?? true,
      p_frequency_preference: frequencyPreference ?? 'normal',
      p_preferred_language: preferredLanguage ?? 'id',
    });

    if (error) {
      throw new Error(`Failed to update preferences: ${error.message}`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Email preferences updated successfully',
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error updating email preferences:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to update email preferences' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
