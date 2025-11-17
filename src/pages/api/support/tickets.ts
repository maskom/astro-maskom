import { supabase } from '../../../lib/supabase.ts';
import { logger } from '../../../lib/logger.ts';
import {
  authenticateRequest,
  createErrorResponse,
  createSuccessResponse,
  logError,
  type APIContext,
} from '../../../lib/api-utils.ts';

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
    const category = url.searchParams.get('category');
    const offset = (page - 1) * limit;

    // Get support tickets
    let ticketsQuery = supabase!
      .from('support_tickets')
      .select('*', { count: 'exact' })
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false });

    if (status) {
      ticketsQuery = ticketsQuery.in('status', status.split(','));
    }

    if (category) {
      ticketsQuery = ticketsQuery.in('category', category.split(','));
    }

    const {
      data: tickets,
      error: ticketsError,
      count,
    } = await ticketsQuery.range(offset, offset + limit - 1);

    if (ticketsError) {
      logError('Error fetching support tickets', user.id, ticketsError);
      return createErrorResponse('Failed to fetch support tickets', 500);
    }

    // Get messages for each ticket
    const ticketsWithMessages = await Promise.all(
      (tickets || []).map(async ticket => {
        const { data: messages } = await supabase!
          .from('ticket_messages')
          .select('*')
          .eq('ticket_id', ticket.id)
          .order('created_at', { ascending: false })
          .limit(5);

        return {
          ...ticket,
          messages: messages || [],
          unread_count:
            messages?.filter(
              msg => !msg.is_internal && msg.sender_id !== user.id
            ).length || 0,
        };
      })
    );

    const supportData = {
      tickets: ticketsWithMessages,
      pagination: {
        page,
        limit,
        total: count || 0,
        pages: Math.ceil((count || 0) / limit),
      },
    };

    return createSuccessResponse(supportData);
  } catch (error) {
    logError('Support API error', 'unknown', error);
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
    const { subject, description, category, priority = 'medium' } = body;

    // Validate required fields
    if (!subject || !description || !category) {
      return createErrorResponse('Missing required ticket fields', 400);
    }

    const { data: ticket, error: ticketError } = await supabase!
      .from('support_tickets')
      .insert({
        user_id: user.id,
        subject,
        description,
        category,
        priority,
      })
      .select()
      .single();

    if (ticketError) {
      logError('Error creating support ticket', user.id, ticketError);
      return createErrorResponse('Failed to create support ticket', 500);
    }

    logger.info('Support ticket created', {
      userId: user.id,
      ticketId: ticket.id,
      ticketNumber: ticket.ticket_number,
    });

    return createSuccessResponse(
      ticket,
      'Support ticket created successfully',
      201
    );
  } catch (error) {
    logError('Create support ticket error', 'unknown', error);
    return createErrorResponse('Internal server error', 500);
  }
}
