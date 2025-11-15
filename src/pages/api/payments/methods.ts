import { getPaymentManager } from '../../../lib/payments';
import type { APIRoute } from 'astro';

export const GET: APIRoute = async ({ request }) => {
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
    console.error('Payment methods error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to get payment methods' 
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};