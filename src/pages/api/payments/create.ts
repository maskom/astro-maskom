import { getPaymentManager } from '../../../lib/payments';
import { createServerClient } from '../../../lib/supabase';
import { logger } from '../../../lib/logger';
import { validateRequest, createHeaders } from '../../../lib/validation';
import { PaymentSchemas } from '../../../lib/validation/schemas';
import type { APIRoute } from 'astro';

export const POST: APIRoute = validateRequest(PaymentSchemas.createPayment)(
  async ({ request, validatedData, requestId }) => {
    try {
      const { orderId, amount, customerDetails, itemDetails, paymentMethod } =
        validatedData;

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
      const paymentRequest = {
        orderId,
        amount,
        customerDetails,
        itemDetails,
        paymentMethod,
      };

      logger.info('Processing payment', {
        requestId,
        userId: user.id,
        orderId,
        amount,
        paymentMethod,
      });

      const result = await paymentManager.processPayment(
        paymentRequest,
        user.id
      );

      logger.info('Payment processed successfully', {
        requestId,
        userId: user.id,
        transactionId: result.transaction?.id,
      });

      return new Response(
        JSON.stringify({
          success: true,
          transaction: result.transaction,
          paymentResponse: result.paymentResponse,
        }),
        { status: 200, headers: createHeaders(requestId) }
      );
    } catch (error) {
      logger.error('Payment creation error', error as Error, { requestId });
      return new Response(
        JSON.stringify({
          success: false,
          error:
            error instanceof Error
              ? error.message
              : 'Payment processing failed',
        }),
        { status: 500, headers: createHeaders(requestId) }
      );
    }
  }
);
