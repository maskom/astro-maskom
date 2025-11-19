import { supabase } from '../../../lib/supabase.ts';
import { logger } from '../../../lib/logger.ts';
import {
  authenticateRequest,
  createErrorResponse,
  createSuccessResponse,
  logError,
  type APIContext,
} from '../../../lib/utils/api';

export async function GET({ request }: APIContext) {
  try {
    if (!supabase) {
      return createErrorResponse('Database connection unavailable', 503);
    }

    const user = await authenticateRequest(request);
    if (!user) {
      return createErrorResponse('Unauthorized', 401);
    }

    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '10');
    const status = url.searchParams.get('status');
    const offset = (page - 1) * limit;

    // Get outstanding invoices
    let invoicesQuery = supabase
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
      `,
        { count: 'exact' }
      )
      .eq('user_id', user.id)
      .order('due_date', { ascending: true });

    if (status) {
      invoicesQuery = invoicesQuery.in('status', status.split(','));
    }

    const {
      data: invoices,
      error: invoicesError,
      count,
    } = await invoicesQuery.range(offset, offset + limit - 1);

    if (invoicesError) {
      logError('Error fetching invoices', user.id, invoicesError);
      return createErrorResponse('Failed to fetch invoices', 500);
    }

    // Calculate current balance
    const currentBalance = (invoices || [])
      .filter(invoice => ['sent', 'overdue'].includes(invoice.status))
      .reduce((sum, invoice) => sum + Number(invoice.total), 0);

    // Get payment methods
    const { data: paymentMethods, error: methodsError } = await supabase
      .from('payment_methods')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (methodsError) {
      logError('Error fetching payment methods', user.id, methodsError);
      return createErrorResponse('Failed to fetch payment methods', 500);
    }

    const billingData = {
      current_balance: currentBalance,
      invoices: invoices || [],
      payment_methods: paymentMethods || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        pages: Math.ceil((count || 0) / limit),
      },
    };

    return createSuccessResponse(billingData);
  } catch (error) {
    logError('Billing API error', 'unknown', error);
    return createErrorResponse('Internal server error', 500);
  }
}

export async function POST({ request }: APIContext) {
  try {
    if (!supabase) {
      return createErrorResponse('Database connection unavailable', 503);
    }

    const user = await authenticateRequest(request);
    if (!user) {
      return createErrorResponse('Unauthorized', 401);
    }

    const body = await request.json();
    const {
      type,
      provider,
      method_identifier,
      display_name,
      metadata = {},
    } = body;

    // Validate required fields
    if (!type || !provider || !method_identifier || !display_name) {
      return createErrorResponse('Missing required payment method fields', 400);
    }

    const { data: paymentMethod, error: methodError } = await supabase
      .from('payment_methods')
      .insert({
        user_id: user.id,
        type,
        provider,
        method_identifier,
        display_name,
        metadata,
      })
      .select()
      .single();

    if (methodError) {
      logError('Error creating payment method', user.id, methodError);
      return createErrorResponse('Failed to create payment method', 500);
    }

    logger.info('Payment method created', {
      userId: user.id,
      methodId: paymentMethod.id,
    });

    return createSuccessResponse(
      {
        success: true,
        data: paymentMethod,
        message: 'Payment method added successfully'
      },
      201
    );
  } catch (error) {
    logError('Create payment method error', 'unknown', error);
    return createErrorResponse('Internal server error', 500);
  }
}
