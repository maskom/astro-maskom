import { getPaymentManager } from '../../../lib/payments';
import { createServerClient } from '../../../lib/supabase';
import { logger } from '../../../lib/logger';
import { validateRequest, createHeaders } from '../../../lib/validation';
import { PaymentSchemas } from '../../../lib/validation/schemas';
import type { APIRoute } from 'astro';

export const POST: APIRoute = validateRequest(PaymentSchemas.refundPayment)(
  async ({ request, validatedData, requestId }) => {
    try {
      const { transactionId, amount, reason } = validatedData;

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

      const paymentManager = getPaymentManager();

      logger.info('Processing refund', {
        requestId,
        userId: user.id,
        transactionId,
        amount,
        reason,
      });

      const result = await paymentManager.refundPayment(transactionId, amount);

      logger.info('Refund processed successfully', {
        requestId,
        userId: user.id,
        transactionId,
      });

      return new Response(
        JSON.stringify({
          success: true,
          paymentResponse: result,
        }),
        { status: 200, headers: createHeaders(requestId) }
      );
    } catch (error) {
      logger.error('Payment refund error', error as Error, { requestId });
      return new Response(
        JSON.stringify({
          success: false,
          error:
            error instanceof Error ? error.message : 'Failed to refund payment',
        }),
        { status: 500, headers: createHeaders(requestId) }
      );
    }
  }
);
