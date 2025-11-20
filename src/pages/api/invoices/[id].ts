import { supabase } from '../../../lib/supabase.ts';
import {
  authenticateRequest,
  createErrorResponse,
  createSuccessResponse,
  logError,
  type APIContext,
} from '../../../lib/utils/api';

export async function GET({ params, request }: APIContext) {
  try {
    if (!supabase) {
      return createErrorResponse('Database connection unavailable', 503);
    }

    const user = await authenticateRequest(request);
    if (!user) {
      return createErrorResponse('Unauthorized', 401);
    }

    const invoiceId = params.id;

    // Get invoice with items
    const { data: invoice, error } = await supabase
      .from('invoices')
      .select(
        `
        *,
        invoice_items (
          id,
          description,
          quantity,
          unit_price,
          total
        )
      `
      )
      .eq('id', invoiceId)
      .eq('user_id', user.id)
      .single();

    if (error || !invoice) {
      logError('Error fetching invoice', user.id, error);
      return createErrorResponse('Invoice not found', 404);
    }

    return createSuccessResponse({ invoice });
  } catch (error) {
    logError('Invoice API error', 'unknown', error);
    return createErrorResponse('Internal server error', 500);
  }
}
