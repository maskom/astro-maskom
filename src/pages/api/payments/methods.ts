import { getPaymentManager } from '../../../lib/payments';
import { logger } from '../../../lib/logger';
import { validateRequest, createHeaders } from '../../../lib/validation';
import { PaymentSchemas } from '../../../lib/validation/schemas';
import type { APIRoute } from 'astro';

export const GET: APIRoute = validateRequest(PaymentSchemas.paymentMethods, {
  source: 'query',
})(async ({ validatedData, requestId }) => {
  try {
    const { type } = validatedData;

    logger.info('Getting payment methods', {
      requestId,
      type,
    });

    const paymentManager = getPaymentManager();
    const paymentMethods = await paymentManager.getPaymentMethods();

    logger.info('Payment methods retrieved', {
      requestId,
      methodCount: paymentMethods.length,
    });

    return new Response(
      JSON.stringify({
        success: true,
        paymentMethods,
      }),
      { status: 200, headers: createHeaders(requestId) }
    );
  } catch (error) {
    logger.error('Payment methods error', error as Error, { requestId });
    return new Response(
      JSON.stringify({
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to get payment methods',
      }),
      { status: 500, headers: createHeaders(requestId) }
    );
  }
});
