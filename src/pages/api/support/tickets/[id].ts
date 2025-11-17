import { supabase } from '../../../../lib/supabase.ts';
import { logger } from '../../../../lib/logger.ts';
import {
  authenticateRequest,
  createErrorResponse,
  createSuccessResponse,
  logError,
  type APIContext,
} from '../../../../lib/api-utils.ts';

export async function POST({ request, params }: APIContext) {
  try {
    if (!supabase) {
      return createErrorResponse('Database connection unavailable', 503);
    }

    const user = await authenticateRequest(request);
    if (!user) {
      return createErrorResponse('Unauthorized', 401);
    }

    const ticketId = params?.id;
    if (!ticketId) {
      return createErrorResponse('Ticket ID is required', 400);
    }

    const body = await request.json();
    const { message, attachments = [] } = body;

    // Validate required fields
    if (!message) {
      return createErrorResponse('Message is required', 400);
    }

    // Verify ticket ownership
    const { data: ticket, error: ticketError } = await supabase!
      .from('support_tickets')
      .select('*')
      .eq('id', ticketId)
      .eq('user_id', user.id)
      .single();

    if (ticketError || !ticket) {
      return createErrorResponse('Ticket not found', 404);
    }

    // Create message
    const { data: ticketMessage, error: messageError } = await supabase!
      .from('ticket_messages')
      .insert({
        ticket_id: ticketId,
        sender_id: user.id,
        message,
        attachments,
        is_internal: false,
      })
      .select()
      .single();

    if (messageError) {
      logError('Error creating ticket message', user.id, messageError);
      return createErrorResponse('Failed to send message', 500);
    }

    // Update ticket status and timestamp
    await supabase
      .from('support_tickets')
      .update({
        status: 'pending_customer',
        updated_at: new Date().toISOString(),
      })
      .eq('id', ticketId);

    logger.info('Ticket message sent', {
      userId: user.id,
      ticketId,
      messageId: ticketMessage.id,
    });

    return createSuccessResponse(
      ticketMessage,
      'Message sent successfully',
      201
    );
  } catch (error) {
    logError('Send ticket message error', 'unknown', error);
    return createErrorResponse('Internal server error', 500);
  }
}

export async function GET({ request, params }: APIContext) {
  try {
    if (!supabase) {
      return createErrorResponse('Database connection unavailable', 503);
    }

    const user = await authenticateRequest(request);
    if (!user) {
      return createErrorResponse('Unauthorized', 401);
    }

    const ticketId = params?.id;
    if (!ticketId) {
      return createErrorResponse('Ticket ID is required', 400);
    }

    // Verify ticket ownership and get details
    const { data: ticket, error: ticketError } = await supabase!
      .from('support_tickets')
      .select('*')
      .eq('id', ticketId)
      .eq('user_id', user.id)
      .single();

    if (ticketError || !ticket) {
      return createErrorResponse('Ticket not found', 404);
    }

    // Get all messages for this ticket
    const { data: messages, error: messagesError } = await supabase!
      .from('ticket_messages')
      .select('*')
      .eq('ticket_id', ticketId)
      .order('created_at', { ascending: true });

    if (messagesError) {
      logError('Error fetching ticket messages', user.id, messagesError);
      return createErrorResponse('Failed to fetch messages', 500);
    }

    const ticketData = {
      ...ticket,
      messages: messages || [],
    };

    return createSuccessResponse(ticketData);
  } catch (error) {
    logError('Get ticket details error', 'unknown', error);
    return createErrorResponse('Internal server error', 500);
  }
}
