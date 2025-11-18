import { getPaymentManager } from '../../../lib/payments';
import { createServerClient } from '../../../lib/supabase';
import { logger } from '../../../lib/logger';
import { validateRequest } from '../../../lib/validation';
import { PaymentSchemas } from '../../../lib/validation/schemas';
import type { APIRoute } from 'astro';

export const POST: APIRoute = validateRequest(PaymentSchemas.cancelPayment)(
  async ({ request, validatedData, requestId }) => {
    try {
      const { transactionId, reason } = validatedData;

      // Get authenticated user
      const authHeader = request.headers.get('Authorization');
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        logger.warn('Missing authentication header', undefined, { requestId });
        return new Response(
          JSON.stringify({ success: false, error: 'Authentication required' }),
          {
            status: 401,
            headers: {
              'Content-Type': 'application/json',
              'X-Request-ID': requestId,
            },
          }
        );
      }

      const token = authHeader.split(' ')[1];
      const supabase = createServerClient();
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser(token);

      if (authError || !user) {
        logger.warn('Invalid authentication token', authError, { requestId });
        return new Response(
          JSON.stringify({
            success: false,
            error: 'Invalid authentication token',
          }),
          {
            status: 401,
            headers: {
              'Content-Type': 'application/json',
              'X-Request-ID': requestId,
            },
          }
        );
      }

      const paymentManager = getPaymentManager();

      logger.info('Cancelling payment', {
        requestId,
        userId: user.id,
        transactionId,
        reason,
      });

      const result = await paymentManager.cancelPayment(transactionId);

      logger.info('Payment cancelled successfully', {
        requestId,
        userId: user.id,
        transactionId,
      });

      return new Response(
        JSON.stringify({
          success: true,
          paymentResponse: result,
        }),
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'X-Request-ID': requestId,
          },
        }
      );
    } catch (error) {
      logger.error('Payment cancellation error', error as Error, { requestId });
      return new Response(
        JSON.stringify({
          success: false,
          error:
            error instanceof Error ? error.message : 'Failed to cancel payment',
        }),
        {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
            'X-Request-ID': requestId,
          },
        }
      );
    }
  }
);
