import { getPaymentManager } from '../../../lib/payments';
import { createServerClient } from '../../../lib/supabase';
import { logger, generateRequestId } from '../../../lib/logger';
import type { APIRoute } from 'astro';

export const POST: APIRoute = async ({ request }) => {
  const requestId = generateRequestId();
  let orderId: string | undefined;
  let amount: number | undefined;
  let customerDetails: any;
  let itemDetails: any;
  let paymentMethod: string | undefined;
  let userId: string | undefined;

  // Mark variables as used to avoid linting errors
  void customerDetails;
  void itemDetails;
  void paymentMethod;

  try {
    const body = await request.json();
    const { orderId, amount, customerDetails, itemDetails, paymentMethod } =
      body;

    if (!orderId || !amount || !customerDetails || !itemDetails) {
      return new Response(
        JSON.stringify({
          success: false,
          error:
            'Missing required fields: orderId, amount, customerDetails, itemDetails',
        }),
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
    const paymentRequest = {
      orderId,
      amount,
      customerDetails,
      itemDetails,
      paymentMethod,
    };

    const result = await paymentManager.processPayment(paymentRequest, user.id);

    return new Response(
      JSON.stringify({
        success: true,
        transaction: result.transaction,
        paymentResponse: result.paymentResponse,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    logger.apiError('Payment creation error', error, {
      requestId,
      userId,
      endpoint: '/api/payments/create',
      method: 'POST',
      orderId,
      amount,
    });
    return new Response(
      JSON.stringify({
        success: false,
        error:
          error instanceof Error ? error.message : 'Payment processing failed',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
