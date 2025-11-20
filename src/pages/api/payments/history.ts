import { getPaymentManager } from '../../../lib/payments';
import { createServerClient } from '../../../lib/supabase';
import { logger } from '../../../lib/logger';
import { validateRequest, createHeaders } from '../../../lib/validation';
import {
  PaymentSchemas,
  ValidatedPaymentHistoryData,
} from '../../../lib/validation/schemas';
import type { APIRoute } from 'astro';

export const GET: APIRoute = validateRequest(PaymentSchemas.paymentHistory, {
  source: 'query',
})(async ({ request, validatedData, requestId }) => {
  try {
    const {
      limit = 20,
      offset = 0,
      startDate,
      endDate,
      status,
    } = (validatedData || {}) as unknown as ValidatedPaymentHistoryData;

    // Get authenticated user
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      logger.warn('Missing authentication header', { requestId });
      return new Response(
        JSON.stringify({ success: false, error: 'Authentication required' }),
        { status: 401, headers: createHeaders(requestId) }
      );
    }

    const token = authHeader.split(' ')[1];
    const supabase = createServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      logger.warn('Invalid authentication token', {
        requestId,
        error: authError?.message,
      });
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Invalid authentication token',
        }),
        { status: 401, headers: createHeaders(requestId) }
      );
    }

    logger.info('Getting payment history', {
      requestId,
      userId: user.id,
      limit,
      offset,
      startDate,
      endDate,
      status,
    });

    const paymentManager = getPaymentManager();
    const transactions = await paymentManager.getUserPaymentHistory(
      user.id,
      limit,
      offset
    );

    logger.info('Payment history retrieved', {
      requestId,
      userId: user.id,
      transactionCount: transactions.length,
    });

    return new Response(
      JSON.stringify({
        success: true,
        transactions,
        pagination: {
          limit,
          offset,
          hasMore: transactions.length === limit,
        },
      }),
      { status: 200, headers: createHeaders(requestId) }
    );
  } catch (error) {
    logger.error('Payment history error', error as Error, { requestId });
    return new Response(
      JSON.stringify({
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to get payment history',
      }),
      { status: 500, headers: createHeaders(requestId) }
    );
  }
});
