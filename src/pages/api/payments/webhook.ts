import { getPaymentManager } from '../../../lib/payments';
import type { APIRoute } from 'astro';

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    
    // Log the webhook for debugging
    console.log('Midtrans webhook received:', JSON.stringify(body, null, 2));

    // Verify webhook signature
    const paymentManager = getPaymentManager();
    
    try {
      const result = await paymentManager.handleWebhook(body);
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Webhook processed successfully',
          transactionId: result.transactionId 
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    } catch (webhookError) {
      console.error('Webhook processing error:', webhookError);
      
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: webhookError instanceof Error ? webhookError.message : 'Webhook processing failed' 
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

  } catch (error) {
    console.error('Webhook handler error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Internal server error' 
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};