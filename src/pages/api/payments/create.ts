import { getPaymentManager } from '../../../lib/payments';
import { supabase } from '../../../lib/supabase';
import type { APIRoute } from 'astro';

export const POST: APIRoute = async ({ request }) => {
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
    const {
      data: { user },
      error: authError,
    } = await (supabase?.auth.getUser(token) ||
      Promise.resolve({
        data: { user: null },
        error: new Error('Supabase not available'),
      }));

    if (authError || !user || !supabase) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Invalid authentication token',
        }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
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
    console.error('Payment creation error:', error);
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
