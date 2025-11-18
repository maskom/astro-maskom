import { getPaymentManager } from '../../../lib/payments';
import { createServerClient } from '../../../lib/supabase';
import { logger, generateRequestId } from '../../../lib/logger';
import type { APIRoute } from 'astro';

export const POST: APIRoute = async ({ request }) => {
  const requestId = generateRequestId();
  let userId: string | undefined;
  
  try {
    const body = await request.json();
    const { orderId } = body;

    if (!orderId) {
      return new Response(
        JSON.stringify({ success: false, error: 'orderId is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Get authenticated user
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ success: false, error: 'Authentication required' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.split(' ')[1];
    const supabase = createServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Invalid authentication token',
        }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    userId = user.id;

    const paymentManager = getPaymentManager();
    const result = await paymentManager.cancelPayment(orderId);

    return new Response(
      JSON.stringify({
        success: true,
        paymentResponse: result,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    logger.apiError('Payment cancellation error', error, {
      requestId,
      userId,
      endpoint: '/api/payments/cancel',
      method: 'POST',
      orderId
    });
    return new Response(
      JSON.stringify({
        success: false,
        error:
          error instanceof Error ? error.message : 'Failed to cancel payment',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
