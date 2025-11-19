import type { APIRoute } from 'astro';
import { withApiMiddleware, setUserContext } from '../../../lib/middleware/api';
import {
  authenticateUser,
  createServiceClient,
  getQueryParams,
  createSuccessResponse,
  handleDatabaseError,
} from '../../../lib/utils/api';
import { ErrorFactory, Validation } from '../../../lib/errors';

export const GET: APIRoute = withApiMiddleware(async ({ request }) => {
  const { user } = await authenticateUser(request);
  setUserContext(request, user.id);

  const params = getQueryParams(request.url, {
    unreadOnly: { type: 'boolean' },
    limit: { default: '20', type: 'number' },
  });

  if (typeof params.limit === 'number') {
    Validation.range(params.limit, 1, 100, 'limit');
  }

  const limit = params.limit as number;
  const supabase = createServiceClient();

  let query = supabase
    .from('usage_notifications')
    .select('*')
    .eq('user_id', user.id)
    .order('sent_at', { ascending: false })
    .limit(limit);

  if (params.unreadOnly) {
    query = query.eq('is_read', false);
  }

  const { data: notifications, error: notifError } = await query;

  if (notifError) {
    handleDatabaseError(notifError, 'fetch notifications');
  }

  // Get unread count
  const { count: unreadCount, error: countError } = await supabase
    .from('usage_notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('is_read', false);

  if (countError) {
    handleDatabaseError(countError, 'count unread notifications');
  }

  return createSuccessResponse({
    notifications: notifications || [],
    unreadCount: unreadCount || 0,
  });
});

export const PUT: APIRoute = withApiMiddleware(async ({ request }) => {
  const { user } = await authenticateUser(request);
  setUserContext(request, user.id);

  const body = await request.json();
  const { notificationIds, markAsRead } = body;

  if (!notificationIds || !Array.isArray(notificationIds)) {
    throw ErrorFactory.validationFailed('Notification IDs array required');
  }

  const supabase = createServiceClient();

  // Update notifications
  const { data, error: updateError } = await supabase
    .from('usage_notifications')
    .update({ is_read: markAsRead !== false })
    .eq('user_id', user.id)
    .in('id', notificationIds)
    .select();

  if (updateError) {
    handleDatabaseError(updateError, 'update notifications');
  }

  return createSuccessResponse({
    success: true,
    updatedCount: data?.length || 0,
  });
});

export const DELETE: APIRoute = withApiMiddleware(async ({ request }) => {
  const { user } = await authenticateUser(request);
  setUserContext(request, user.id);

  const body = await request.json();
  const { notificationIds } = body;

  if (!notificationIds || !Array.isArray(notificationIds)) {
    throw ErrorFactory.validationFailed('Notification IDs array required');
  }

  const supabase = createServiceClient();

  // Delete notifications
  const { error: deleteError } = await supabase
    .from('usage_notifications')
    .delete()
    .eq('user_id', user.id)
    .in('id', notificationIds);

  if (deleteError) {
    handleDatabaseError(deleteError, 'delete notifications');
  }

  return createSuccessResponse({
    success: true,
  });
});
