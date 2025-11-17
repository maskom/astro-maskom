import { supabase } from '../../../lib/supabase.ts';
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

    // Get user's subscriptions with package details
    const { data: subscriptions, error } = await supabase
      .from('service_subscriptions')
      .select(
        `
        *,
        packages (
          id,
          name,
          description,
          speed,
          price
        )
      `
      )
      .eq('user_id', user.id)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) {
      logError('Error fetching subscriptions', user.id, error);
      return createErrorResponse('Failed to fetch subscriptions', 500);
    }

    return createSuccessResponse({ subscriptions: subscriptions || [] });
  } catch (error) {
    logError('Subscriptions API error', 'unknown', error);
    return createErrorResponse('Internal server error', 500);
  }
}

export async function POST({ request }: APIContext) {
  try {
    if (!supabase) {
      return createErrorResponse('Database connection unavailable', 503);
    }

    const user = await authenticateRequest(request);
    if (!user) {
      return createErrorResponse('Unauthorized', 401);
    }

    const body = await request.json();
    const { package_id, billing_day = 1 } = body;

    // Validate required fields
    if (!package_id) {
      return createErrorResponse('Package ID is required', 400);
    }

    if (billing_day < 1 || billing_day > 31) {
      return createErrorResponse('Billing day must be between 1 and 31', 400);
    }

    // Get package details
    const { data: packageData, error: packageError } = await supabase
      .from('packages')
      .select('*')
      .eq('id', package_id)
      .single();

    if (packageError || !packageData) {
      return createErrorResponse('Package not found', 404);
    }

    // Set next billing date
    const nextBillingDate = new Date();
    nextBillingDate.setDate(billing_day);
    if (nextBillingDate <= new Date()) {
      nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);
    }

    // Create subscription
    const { data: subscription, error } = await supabase
      .from('service_subscriptions')
      .insert({
        user_id: user.id,
        package_id,
        monthly_amount: packageData.price,
        billing_day,
        next_billing_date: nextBillingDate.toISOString(),
        is_active: true,
      })
      .select(
        `
        *,
        packages (
          id,
          name,
          description,
          speed,
          price
        )
      `
      )
      .single();

    if (error) {
      logError('Error creating subscription', user.id, error);
      return createErrorResponse('Failed to create subscription', 500);
    }

    logger.info('Subscription created', {
      userId: user.id,
      subscriptionId: subscription.id,
      packageId: package_id,
    });

    return createSuccessResponse(
      {
        subscription,
        message: 'Subscription created successfully',
      },
      201
    );
  } catch (error) {
    logError('Create subscription error', 'unknown', error);
    return createErrorResponse('Internal server error', 500);
  }
}
