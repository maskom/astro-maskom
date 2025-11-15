import { getPaymentManager } from '../../../lib/payments';
import { supabase } from '../../../lib/supabase';
import type { APIRoute } from 'astro';

export const GET: APIRoute = async ({ request }) => {
  try {
    const url = new URL(request.url);
    const invoiceId = url.searchParams.get('id');

    if (!invoiceId) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invoice ID is required' }),
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
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid authentication token' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const paymentManager = getPaymentManager();
    const invoice = await paymentManager.service.getInvoiceById(invoiceId);

    if (!invoice) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invoice not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Check if user owns this invoice
    if (invoice.userId !== user.id) {
      return new Response(
        JSON.stringify({ success: false, error: 'Access denied' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        invoice,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Invoice details error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to get invoice details' 
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};