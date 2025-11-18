import { getPaymentManager } from '../../../lib/payments';
import { logger } from '../../../lib/logger';
import { validateRequest } from '../../../lib/validation';
import { PaymentSchemas } from '../../../lib/validation/schemas';
import type { APIRoute } from 'astro';

export const GET: APIRoute = validateRequest(PaymentSchemas.paymentStatus, {
  source: 'query',
})(async ({ validatedData, requestId }) => {
  try {
    const { transactionId } = validatedData;

    logger.info('Getting payment status', {
      requestId,
      transactionId,
    });

    const paymentManager = getPaymentManager();
    const status = await paymentManager.getTransactionStatus(transactionId);

    logger.info('Payment status retrieved', {
      requestId,
      transactionId,
    });

    return new Response(
      JSON.stringify({
        success: true,
        status,
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
    logger.error('Payment status error', error as Error, { requestId });
    return new Response(
      JSON.stringify({
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to get payment status',
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
});
