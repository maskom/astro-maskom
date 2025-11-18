import { getPaymentManager } from '../../../lib/payments';
import { logger, generateRequestId } from '../../../lib/logger';
import type { APIRoute } from 'astro';

export const GET: APIRoute = async () => {
  const requestId = generateRequestId();
  
  try {
    const paymentManager = getPaymentManager();
    const paymentMethods = await paymentManager.getPaymentMethods();

    return new Response(
      JSON.stringify({
        success: true,
        paymentMethods,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    logger.apiError('Payment methods error', error, {
      requestId,
      endpoint: '/api/payments/methods',
      method: 'GET'
    });
    
    return new Response(
      JSON.stringify({
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to get payment methods',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
