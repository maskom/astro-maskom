import { supabase } from '../../../lib/supabase.ts';
import {
  authenticateRequest,
  createErrorResponse,
  createSuccessResponse,
  logError,
  type APIContext,
} from '../../../lib/utils/api';

export async function POST({ request }: APIContext) {
  try {
    if (!supabase) {
      return createErrorResponse('Database connection unavailable', 503);
    }

    const user = await authenticateRequest(request);
    if (!user) {
      return createErrorResponse('Unauthorized', 401);
    }

    const settings = await request.json();

    // Save billing preferences to database
    const { error } = await supabase.from('billing_preferences').upsert({
      user_id: user.id,
      email_notifications: settings.email_notifications,
      sms_notifications: settings.sms_notifications,
      payment_reminders: settings.payment_reminders,
      overdue_reminders: settings.overdue_reminders,
      payment_confirmations: settings.payment_confirmations,
      monthly_statements: settings.monthly_statements,
      auto_payment: settings.auto_payment,
      default_payment_method: settings.default_payment_method || null,
      billing_address: settings.billing_address,
      tax_information: settings.tax_information,
      updated_at: new Date().toISOString(),
    });

    if (error) {
      logError('Error saving billing preferences', user.id, error);
      return createErrorResponse('Failed to save billing preferences', 500);
    }

    return createSuccessResponse({
      message: 'Billing settings saved successfully',
      settings,
    });
  } catch (error) {
    logError('Billing settings error', 'unknown', error);
    return createErrorResponse('Internal server error', 500);
  }
}

export async function GET({ request }: APIContext) {
  try {
    if (!supabase) {
      return createErrorResponse('Database connection unavailable', 503);
    }

    const user = await authenticateRequest(request);
    if (!user) {
      return createErrorResponse('Unauthorized', 401);
    }

    // Fetch billing preferences from database
    const { data: preferences, error } = await supabase
      .from('billing_preferences')
      .select('*')
      .eq('user_id', user.id)
      .single();

    let settings;
    if (error || !preferences) {
      // Return default settings if none exist
      settings = {
        email_notifications: true,
        sms_notifications: false,
        payment_reminders: true,
        overdue_reminders: true,
        payment_confirmations: true,
        monthly_statements: true,
        auto_payment: false,
        default_payment_method: '',
        billing_address: {
          street: '',
          city: '',
          postal_code: '',
          country: 'Indonesia',
        },
        tax_information: {
          tax_id: '',
          business_name: '',
          is_business: false,
        },
      };
    } else {
      settings = {
        email_notifications: preferences.email_notifications,
        sms_notifications: preferences.sms_notifications,
        payment_reminders: preferences.payment_reminders,
        overdue_reminders: preferences.overdue_reminders,
        payment_confirmations: preferences.payment_confirmations,
        monthly_statements: preferences.monthly_statements,
        auto_payment: preferences.auto_payment,
        default_payment_method: preferences.default_payment_method || '',
        billing_address: preferences.billing_address,
        tax_information: preferences.tax_information,
      };
    }

    return createSuccessResponse({ settings: defaultSettings });
  } catch (error) {
    logError('Get billing settings error', 'unknown', error);
    return createErrorResponse('Internal server error', 500);
  }
}
