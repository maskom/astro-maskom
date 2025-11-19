import type { APIRoute } from 'astro';
import { withApiMiddleware, setUserContext } from '../../../lib/middleware/api';
import {
  authenticateUser,
  authenticateAdmin,
  createServiceClient,
  getQueryParams,
  createSuccessResponse,
  handleDatabaseError,
} from '../../../lib/utils/api';
import { Validation } from '../../../lib/errors';

export const GET: APIRoute = withApiMiddleware(async ({ request }) => {
  const params = getQueryParams(request.url, {
    days: { default: '30', type: 'number' },
    userId: { type: 'string' },
  });

  if (typeof params.days === 'number') {
    Validation.range(params.days, 1, 365, 'days');
  }

  const days = params.days as number;
  const supabase = createServiceClient();

  // Get current user if userId not provided (for customer access)
  if (!params.userId) {
    const { user } = await authenticateUser(request);
    setUserContext(request, user.id);

    // Get bandwidth usage for the user
    const { data: usage, error: usageError } = await supabase
      .from('bandwidth_usage')
      .select('*')
      .eq('user_id', user.id)
      .gte(
        'usage_date',
        new Date(Date.now() - days * 24 * 60 * 60 * 1000)
          .toISOString()
          .split('T')[0]
      )
      .order('usage_date', { ascending: true });

    if (usageError) {
      handleDatabaseError(usageError, 'fetch bandwidth usage');
    }

    // Get data cap information
    const { data: dataCap, error: capError } = await supabase
      .from('data_caps')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single();

    if (capError && capError.code !== 'PGRST116') {
      handleDatabaseError(capError, 'fetch data cap');
    }

    // Get notifications
    const { data: notifications, error: notifError } = await supabase
      .from('usage_notifications')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_read', false)
      .order('sent_at', { ascending: false })
      .limit(10);

    if (notifError) {
      handleDatabaseError(notifError, 'fetch notifications');
    }

    const totalUsageGB =
      usage?.reduce(
        (sum, day) => sum + day.total_bytes / (1024 * 1024 * 1024),
        0
      ) || 0;

    const averageDailyGB = usage?.length
      ? usage.reduce(
          (sum, day) => sum + day.total_bytes / (1024 * 1024 * 1024),
          0
        ) / usage.length
      : 0;

    return createSuccessResponse({
      usage: usage || [],
      dataCap: dataCap || null,
      notifications: notifications || [],
      summary: {
        totalUsageGB,
        averageDailyGB,
        usagePercentage: dataCap
          ? (dataCap.current_usage_gb / dataCap.monthly_cap_gb) * 100
          : 0,
      },
    });
  }

  // Admin access to specific user data
  const { user } = await authenticateAdmin(request);
  setUserContext(request, user.id);

  // Get bandwidth usage for specified user
  const { data: usage, error: usageError } = await supabase
    .from('bandwidth_usage')
    .select('*')
    .eq('user_id', params.userId)
    .gte(
      'usage_date',
      new Date(Date.now() - days * 24 * 60 * 60 * 1000)
        .toISOString()
        .split('T')[0]
    )
    .order('usage_date', { ascending: true });

  if (usageError) {
    handleDatabaseError(usageError, 'fetch admin bandwidth usage');
  }

  const totalUsageGB =
    usage?.reduce(
      (sum, day) => sum + day.total_bytes / (1024 * 1024 * 1024),
      0
    ) || 0;

  const averageDailyGB = usage?.length
    ? usage.reduce(
        (sum, day) => sum + day.total_bytes / (1024 * 1024 * 1024),
        0
      ) / usage.length
    : 0;

  return createSuccessResponse({
    usage: usage || [],
    summary: {
      totalUsageGB,
      averageDailyGB,
    },
  });
});
