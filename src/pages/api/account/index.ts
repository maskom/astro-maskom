import { supabase } from '../../../lib/supabase.ts';
import { logger } from '../../../lib/logger.ts';
import {
  authenticateRequest,
  createErrorResponse,
  createSuccessResponse,
  logError,
  type APIContext,
} from '../../../lib/utils/api';

export async function GET({ request }: APIContext) {
  try {
    if (!supabase) {
      return createErrorResponse('Database connection unavailable', 503);
    }

    const user = await authenticateRequest(request);
    if (!user) {
      return createErrorResponse('Unauthorized', 401);
    }

    // Get customer profile
    const { data: profile, error: profileError } = await supabase
      .from('customer_profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (profileError && profileError.code !== 'PGRST116') {
      logError('Error fetching customer profile', user.id, profileError);
      return createErrorResponse('Failed to fetch profile', 500);
    }

    // Get service addresses
    const { data: addresses, error: addressesError } = await supabase
      .from('service_addresses')
      .select('*')
      .eq('user_id', user.id)
      .order('is_primary', { ascending: false });

    if (addressesError) {
      logError('Error fetching service addresses', user.id, addressesError);
      return createErrorResponse('Failed to fetch addresses', 500);
    }

    // Get notification preferences
    const { data: preferences, error: preferencesError } = await supabase
      .from('notification_preferences')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (preferencesError && preferencesError.code !== 'PGRST116') {
      logError(
        'Error fetching notification preferences',
        user.id,
        preferencesError
      );
      return createErrorResponse('Failed to fetch preferences', 500);
    }

    const accountData = {
      user: {
        id: user.id,
        email: user.email,
        phone: user.phone,
      },
      profile: profile || null,
      addresses: addresses || [],
      preferences: preferences || {
        email_notifications: true,
        sms_notifications: false,
        push_notifications: true,
        billing_reminders: true,
        usage_alerts: true,
        maintenance_notifications: true,
        marketing_emails: false,
      },
    };

    return createSuccessResponse(accountData);
  } catch (error) {
    logError('Account API error', 'unknown', error);
    return createErrorResponse('Internal server error', 500);
  }
}

export async function PUT({ request }: APIContext) {
  try {
    if (!supabase) {
      return createErrorResponse('Database connection unavailable', 503);
    }

    const user = await authenticateRequest(request);
    if (!user) {
      return createErrorResponse('Unauthorized', 401);
    }

    const body = await request.json();
    const { profile, preferences } = body;

    // Update customer profile
    if (profile) {
      const { error: profileError } = await supabase
        .from('customer_profiles')
        .upsert(
          {
            user_id: user.id,
            first_name: profile.first_name,
            last_name: profile.last_name,
            phone: profile.phone,
            date_of_birth: profile.date_of_birth,
            gender: profile.gender,
            profile_image_url: profile.profile_image_url,
          },
          {
            onConflict: 'user_id',
          }
        );

      if (profileError) {
        logError('Error updating customer profile', user.id, profileError);
        return createErrorResponse('Failed to update profile', 500);
      }
    }

    // Update notification preferences
    if (preferences) {
      const { error: preferencesError } = await supabase
        .from('notification_preferences')
        .upsert(
          {
            user_id: user.id,
            ...preferences,
          },
          {
            onConflict: 'user_id',
          }
        );

      if (preferencesError) {
        logError(
          'Error updating notification preferences',
          user.id,
          preferencesError
        );
        return createErrorResponse('Failed to update preferences', 500);
      }
    }

    logger.info('Account updated successfully', { userId: user.id });

    return createSuccessResponse({
      success: true,
      data: null,
      message: 'Account updated successfully'
    });
  } catch (error) {
    logError('Account update error', 'unknown', error);
    return createErrorResponse('Internal server error', 500);
  }
}
