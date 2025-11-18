import { getPaymentManager } from '../../../lib/payments';
import { logger, generateRequestId } from '../../../lib/logger';
import type { APIRoute } from 'astro';

export const GET: APIRoute = async ({ request }) => {
  const requestId = generateRequestId();
  
  try {
    const url = new URL(request.url);
    const orderId = url.searchParams.get('order_id');

    if (!orderId) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'order_id parameter is required',
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const paymentManager = getPaymentManager();
    const status = await paymentManager.getTransactionStatus(orderId);

    return new Response(
      JSON.stringify({
        success: true,
        status,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    logger.apiError('Payment status error', error, {
      requestId,
      endpoint: '/api/payments/status',
      method: 'GET',
      orderId
    });
    return new Response(
      JSON.stringify({
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to get payment status',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
