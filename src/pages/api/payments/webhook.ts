import { getPaymentManager } from '../../../lib/payments';
import { logger } from '../../../lib/logger';
import type { APIRoute } from 'astro';

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();

    // Log only safe webhook metadata
    logger.info('Payment webhook received', {
      eventType: body.event_type || body.event,
      transactionId: body.transaction_id || body.order_id,
      timestamp: new Date().toISOString(),
      paymentType: body.payment_type,
      statusCode: body.status_code,
      // Never log full payment details, amounts, or customer data
    });

    // Verify webhook signature
    const paymentManager = getPaymentManager();

    try {
      const result = await paymentManager.handleWebhook(body);

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Webhook processed successfully',
          transactionId: result.transactionId,
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    } catch (webhookError) {
      logger.error('Webhook processing error', webhookError instanceof Error ? webhookError : new Error(String(webhookError)), {
        eventType: body.event_type || body.event,
        transactionId: body.transaction_id || body.order_id,
      });

      return new Response(
        JSON.stringify({
          success: false,
          error:
            webhookError instanceof Error
              ? webhookError.message
              : 'Webhook processing failed',
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
  } catch (error) {
    logger.error('Webhook handler error', error instanceof Error ? error : new Error(String(error)), {
      endpoint: '/api/payments/webhook',
    });
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
