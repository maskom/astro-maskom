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

    // Get customer subscriptions
    const { data: subscriptions, error: subscriptionsError } = await supabase
      .from('customer_subscriptions')
      .select(
        `
        *,
        service_addresses (
          id,
          address_line1,
          city,
          province
        )
      `
      )
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (subscriptionsError) {
      logError('Error fetching subscriptions', user.id, subscriptionsError);
      return createErrorResponse('Failed to fetch subscriptions', 500);
    }

    // Get usage data for active subscriptions
    let usageData = [];
    if (subscriptions && subscriptions.length > 0) {
      const activeSubscription = subscriptions.find(
        sub => sub.status === 'active'
      );
      if (activeSubscription) {
        const { data: usage, error: usageError } = await supabase
          .from('usage_monitoring')
          .select('*')
          .eq('user_id', user.id)
          .eq('subscription_id', activeSubscription.id)
          .gte(
            'measurement_date',
            new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
              .toISOString()
              .split('T')[0]
          )
          .order('measurement_date', { ascending: true });

        if (!usageError) {
          usageData = usage || [];
        }
      }
    }

    // Get service requests
    const { data: serviceRequests, error: requestsError } = await supabase
      .from('service_requests')
      .select('*')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })
      .limit(5);

    if (requestsError) {
      logError('Error fetching service requests', user.id, requestsError);
      return createErrorResponse('Failed to fetch service requests', 500);
    }

    const serviceData = {
      subscriptions: subscriptions || [],
      usage_history: usageData,
      service_requests: serviceRequests || [],
      current_usage:
        usageData.length > 0 ? usageData[usageData.length - 1] : null,
    };

    return createSuccessResponse(serviceData);
  } catch (error) {
    logError('Service management API error', 'unknown', error);
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
    const {
      request_type,
      title,
      description,
      preferred_date,
      preferred_time_window,
      service_address_id,
    } = body;

    // Validate required fields
    if (!request_type || !title || !description) {
      return createErrorResponse(
        'Missing required service request fields',
        400
      );
    }

    const { data: serviceRequest, error: requestError } = await supabase
      .from('service_requests')
      .insert({
        user_id: user.id,
        request_type,
        title,
        description,
        preferred_date,
        preferred_time_window,
        service_address_id,
      })
      .select()
      .single();

    if (requestError) {
      logError('Error creating service request', user.id, requestError);
      return createErrorResponse('Failed to create service request', 500);
    }

    logger.info('Service request created', {
      userId: user.id,
      requestId: serviceRequest.id,
      type: request_type,
    });

    return createSuccessResponse(
      {
        success: true,
        data: serviceRequest,
        message: 'Service request created successfully'
      },
      201
    );
  } catch (error) {
    logError('Create service request error', 'unknown', error);
    return createErrorResponse('Internal server error', 500);
  }
}
