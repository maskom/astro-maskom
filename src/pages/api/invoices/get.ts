import { getPaymentManager } from '../../../lib/payments';
import { createServerClient } from '../../../lib/supabase';
import { logger, generateRequestId } from '../../../lib/logger';
import type { APIRoute } from 'astro';

export const GET: APIRoute = async ({ request }) => {
  const requestId = generateRequestId();
  let userId: string | undefined;
  
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
    const invoice = await paymentManager.getInvoiceById(invoiceId);

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
    logger.apiError('Invoice details error', error, {
      requestId,
      userId,
      endpoint: '/api/invoices/get',
      method: 'GET',
      invoiceId
    });
    return new Response(
      JSON.stringify({
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to get invoice details',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
