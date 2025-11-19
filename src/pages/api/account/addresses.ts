import { supabase } from '../../../lib/supabase.ts';
import {
  authenticateRequest,
  createErrorResponse,
  createSuccessResponse,
  logError,
  type APIContext,
} from '../../../lib/utils/api';
import { logger } from '../../../lib/logger.ts';

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
      address_line1,
      address_line2,
      city,
      province,
      postal_code,
      country = 'Indonesia',
      is_primary = false,
    } = body;

    // Validate required fields
    if (!address_line1 || !city || !province || !postal_code) {
      return createErrorResponse('Missing required address fields', 400);
    }

    // If setting as primary, unset other primary addresses first
    if (is_primary) {
      const { error: updateError } = await supabase
        .from('service_addresses')
        .update({ is_primary: false })
        .eq('user_id', user.id);

      if (updateError) {
        logError('Error unsetting primary addresses', user.id, updateError);
        return createErrorResponse(
          'Failed to update primary address status',
          500
        );
      }
    }

    const { data: address, error: addressError } = await supabase
      .from('service_addresses')
      .insert({
        user_id: user.id,
        address_line1,
        address_line2,
        city,
        province,
        postal_code,
        country,
        is_primary,
      })
      .select()
      .single();

    if (addressError) {
      logError('Error creating service address', user.id, addressError);
      return createErrorResponse('Failed to create address', 500);
    }

    logger.info('Service address created', {
      userId: user.id,
      addressId: address.id,
    });

    return createSuccessResponse(
      {
        success: true,
        data: address,
        message: 'Address created successfully'
      },
      201
    );
  } catch (error) {
    logError('Create address error', 'unknown', error);
    return createErrorResponse('Internal server error', 500);
  }
}

export async function PUT({ request }: APIContext) {
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
      id,
      address_line1,
      address_line2,
      city,
      province,
      postal_code,
      country,
      is_primary,
    } = body;

    if (!id) {
      return createErrorResponse('Address ID is required', 400);
    }

    // If setting as primary, unset other primary addresses first
    if (is_primary) {
      const { error: updateError } = await supabase
        .from('service_addresses')
        .update({ is_primary: false })
        .eq('user_id', user.id)
        .neq('id', id);

      if (updateError) {
        logError(
          'Error unsetting other primary addresses',
          user.id,
          updateError
        );
        return createErrorResponse(
          'Failed to update primary address status',
          500
        );
      }
    }

    const { data: address, error: addressError } = await supabase
      .from('service_addresses')
      .update({
        address_line1,
        address_line2,
        city,
        province,
        postal_code,
        country,
        is_primary,
      })
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (addressError) {
      logError('Error updating service address', user.id, addressError);
      return createErrorResponse('Failed to update address', 500);
    }

    logger.info('Service address updated', {
      userId: user.id,
      addressId: id,
    });

    return createSuccessResponse({
      success: true,
      data: address,
      message: 'Address updated successfully'
    });
  } catch (error) {
    logError('Update address error', 'unknown', error);
    return createErrorResponse('Internal server error', 500);
  }
}

export async function DELETE({ request }: APIContext) {
  try {
    if (!supabase) {
      return createErrorResponse('Database connection unavailable', 503);
    }

    const user = await authenticateRequest(request);
    if (!user) {
      return createErrorResponse('Unauthorized', 401);
    }

    const url = new URL(request.url);
    const addressId = url.searchParams.get('id');

    if (!addressId) {
      return createErrorResponse('Address ID is required', 400);
    }

    const { error: deleteError } = await supabase
      .from('service_addresses')
      .delete()
      .eq('id', addressId)
      .eq('user_id', user.id);

    if (deleteError) {
      logError('Error deleting service address', user.id, deleteError);
      return createErrorResponse('Failed to delete address', 500);
    }

    logger.info('Service address deleted', {
      userId: user.id,
      addressId,
    });

    return createSuccessResponse({
      success: true,
      data: null,
      message: 'Address deleted successfully'
    });
  } catch (error) {
    logError('Delete address error', 'unknown', error);
    return createErrorResponse('Internal server error', 500);
  }
}
