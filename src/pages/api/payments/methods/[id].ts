import { supabase } from '../../../../lib/supabase.ts';
import {
  authenticateRequest,
  createErrorResponse,
  createSuccessResponse,
  logError,
  type APIContext,
} from '../../../../lib/utils/api';

export async function DELETE({ params, request }: APIContext) {
  try {
    if (!supabase) {
      return createErrorResponse('Database connection unavailable', 503);
    }

    const user = await authenticateRequest(request);
    if (!user) {
      return createErrorResponse('Unauthorized', 401);
    }

    const methodId = params.id;

    // Delete payment method (only if it belongs to the user)
    const { error } = await supabase
      .from('payment_methods')
      .delete()
      .eq('id', methodId)
      .eq('user_id', user.id);

    if (error) {
      logError('Error deleting payment method', user.id, error);
      return createErrorResponse('Failed to delete payment method', 500);
    }

    return createSuccessResponse({
      message: 'Payment method deleted successfully',
    });
  } catch (error) {
    logError('Delete payment method error', 'unknown', error);
    return createErrorResponse('Internal server error', 500);
  }
}

export async function PUT({ params, request }: APIContext) {
  try {
    if (!supabase) {
      return createErrorResponse('Database connection unavailable', 503);
    }

    const user = await authenticateRequest(request);
    if (!user) {
      return createErrorResponse('Unauthorized', 401);
    }

    const methodId = params.id;
    const body = await request.json();
    const { display_name, is_active, metadata } = body;

    // Update payment method
    const { data: method, error } = await supabase
      .from('payment_methods')
      .update({
        display_name,
        is_active,
        metadata: metadata || {},
        updated_at: new Date().toISOString(),
      })
      .eq('id', methodId)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      logError('Error updating payment method', user.id, error);
      return createErrorResponse('Failed to update payment method', 500);
    }

    return createSuccessResponse({ method });
  } catch (error) {
    logError('Update payment method error', 'unknown', error);
    return createErrorResponse('Internal server error', 500);
  }
}
