import { supabase } from '../../../lib/supabase.ts';
import { logger } from '../../../lib/logger.ts';
import { loyaltyService } from '../../../lib/loyalty/index.ts';
import { pointsCalculationEngine } from '../../../lib/loyalty/points-engine.ts';
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
    const section = url.searchParams.get('section') || 'overview';

    switch (section) {
      case 'overview':
        return await getLoyaltyOverview(user.id);
      case 'status':
        return await getLoyaltyStatus(user.id);
      case 'tiers':
        return await getLoyaltyTiers();
      case 'transactions':
        return await getPointsTransactions(user.id, url);
      case 'rewards':
        return await getRewardsCatalog(user.id, url);
      case 'redemptions':
        return await getRewardRedemptions(user.id, url);
      case 'referrals':
        return await getReferrals(user.id);
      case 'achievements':
        return await getAchievements(user.id);
      default:
        return createErrorResponse('Invalid section parameter', 400);
    }
  } catch (error) {
    logError('Loyalty API error', 'unknown', error);
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
    const { action, ...data } = body;

    switch (action) {
      case 'redeem':
        return await redeemReward(user.id, data);
      case 'calculate-tenure-points':
        return await calculateTenurePoints(user.id);
      case 'create-referral':
        return await createReferral(user.id, data);
      default:
        return createErrorResponse('Invalid action parameter', 400);
    }
  } catch (error) {
    logError('Loyalty POST API error', 'unknown', error);
    return createErrorResponse('Internal server error', 500);
  }
}

async function getLoyaltyOverview(userId: string) {
  try {
    const [loyaltyStatus, tiers, recentTransactions, activeRedemptions, referrals] = await Promise.all([
      loyaltyService.getCustomerLoyaltyStatus(userId),
      loyaltyService.getLoyaltyTiers(),
      loyaltyService.getPointsTransactions(userId, { limit: 5 }),
      loyaltyService.getRewardRedemptions(userId, { status: 'pending,approved,fulfilled', limit: 5 }),
      loyaltyService.getReferrals(userId),
    ]);

    const nextTier = tiers.find(tier => 
      tier.sort_order > (loyaltyStatus?.current_tier?.sort_order || 0)
    );

    const pointsToNextTier = nextTier 
      ? Math.max(0, nextTier.min_points - (loyaltyStatus?.total_points_earned || 0))
      : 0;

    const overviewData = {
      loyalty_status: loyaltyStatus,
      current_tier: loyaltyStatus?.current_tier,
      next_tier: nextTier,
      points_to_next_tier: pointsToNextTier,
      tier_progress: loyaltyStatus ? {
        current_points: loyaltyStatus.total_points_earned,
        current_tier_min: loyaltyStatus.current_tier?.min_points || 0,
        next_tier_min: nextTier?.min_points || loyaltyStatus.current_tier?.min_points || 0,
      } : null,
      recent_transactions: recentTransactions.transactions,
      active_redemptions: activeRedemptions.redemptions,
      referral_summary: {
        total_referrals: referrals.length,
        completed_referrals: referrals.filter(r => r.referral_status === 'completed').length,
        pending_referrals: referrals.filter(r => r.referral_status === 'invited,registered,activated').length,
      },
    };

    return createSuccessResponse(overviewData);
  } catch (error) {
    logError('Error fetching loyalty overview', userId, error);
    return createErrorResponse('Failed to fetch loyalty overview', 500);
  }
}

async function getLoyaltyStatus(userId: string) {
  try {
    const loyaltyStatus = await loyaltyService.getCustomerLoyaltyStatus(userId);
    
    if (!loyaltyStatus) {
      // Create initial loyalty status
      const { data, error } = await supabase
        .from('customer_loyalty_status')
        .insert({
          user_id: userId,
          total_months_tenure: 0,
        })
        .select(`
          *,
          current_tier:loyalty_tiers(*)
        `)
        .single();

      if (error) {
        logError('Error creating loyalty status', userId, error);
        return createErrorResponse('Failed to create loyalty status', 500);
      }

      return createSuccessResponse(data);
    }

    return createSuccessResponse(loyaltyStatus);
  } catch (error) {
    logError('Error fetching loyalty status', userId, error);
    return createErrorResponse('Failed to fetch loyalty status', 500);
  }
}

async function getLoyaltyTiers() {
  try {
    const tiers = await loyaltyService.getLoyaltyTiers();
    return createSuccessResponse(tiers);
  } catch (error) {
    logError('Error fetching loyalty tiers', 'unknown', error);
    return createErrorResponse('Failed to fetch loyalty tiers', 500);
  }
}

async function getPointsTransactions(userId: string, url: URL) {
  try {
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '10');
    const type = url.searchParams.get('type');
    const sourceType = url.searchParams.get('source_type');
    const offset = (page - 1) * limit;

    const result = await loyaltyService.getPointsTransactions(userId, {
      limit,
      offset,
      type: type || undefined,
      source_type: sourceType || undefined,
    });

    return createSuccessResponse({
      transactions: result.transactions,
      pagination: {
        page,
        limit,
        total: result.total,
        pages: Math.ceil(result.total / limit),
      },
    });
  } catch (error) {
    logError('Error fetching points transactions', userId, error);
    return createErrorResponse('Failed to fetch points transactions', 500);
  }
}

async function getRewardsCatalog(userId: string, url: URL) {
  try {
    const category = url.searchParams.get('category');
    
    // Get user's current tier and points
    const loyaltyStatus = await loyaltyService.getCustomerLoyaltyStatus(userId);
    const userPoints = loyaltyStatus?.current_points_balance || 0;
    const userTierId = loyaltyStatus?.current_tier_id;

    const rewards = await loyaltyService.getRewardsCatalog({
      category: category || undefined,
      min_tier: userTierId,
      user_points: userPoints,
    });

    // Group rewards by category
    const rewardsByCategory = rewards.reduce((acc, reward) => {
      if (!acc[reward.category]) {
        acc[reward.category] = [];
      }
      acc[reward.category].push(reward);
      return acc;
    }, {} as Record<string, any[]>);

    return createSuccessResponse({
      rewards,
      rewards_by_category: rewardsByCategory,
      user_points: userPoints,
      user_tier: loyaltyStatus?.current_tier,
    });
  } catch (error) {
    logError('Error fetching rewards catalog', userId, error);
    return createErrorResponse('Failed to fetch rewards catalog', 500);
  }
}

async function getRewardRedemptions(userId: string, url: URL) {
  try {
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '10');
    const status = url.searchParams.get('status');
    const offset = (page - 1) * limit;

    const result = await loyaltyService.getRewardRedemptions(userId, {
      limit,
      offset,
      status: status || undefined,
    });

    return createSuccessResponse({
      redemptions: result.redemptions,
      pagination: {
        page,
        limit,
        total: result.total,
        pages: Math.ceil(result.total / limit),
      },
    });
  } catch (error) {
    logError('Error fetching reward redemptions', userId, error);
    return createErrorResponse('Failed to fetch reward redemptions', 500);
  }
}

async function getReferrals(userId: string) {
  try {
    const referrals = await loyaltyService.getReferrals(userId);
    
    const referralSummary = {
      total: referrals.length,
      invited: referrals.filter(r => r.referral_status === 'invited').length,
      registered: referrals.filter(r => r.referral_status === 'registered').length,
      activated: referrals.filter(r => r.referral_status === 'activated').length,
      completed: referrals.filter(r => r.referral_status === 'completed').length,
      total_points_awarded: referrals.reduce((sum, r) => sum + r.points_awarded, 0),
    };

    return createSuccessResponse({
      referrals,
      summary: referralSummary,
    });
  } catch (error) {
    logError('Error fetching referrals', userId, error);
    return createErrorResponse('Failed to fetch referrals', 500);
  }
}

async function getAchievements(userId: string) {
  try {
    const [allAchievements, customerAchievements] = await Promise.all([
      loyaltyService.getAchievements(),
      loyaltyService.getCustomerAchievements(userId),
    ]);

    const earnedAchievementIds = new Set(customerAchievements.map(ca => ca.achievement_id));
    const availableAchievements = allAchievements.filter(a => !earnedAchievementIds.has(a.id));

    return createSuccessResponse({
      earned_achievements: customerAchievements,
      available_achievements: availableAchievements,
      total_earned: customerAchievements.length,
      total_available: availableAchievements.length,
    });
  } catch (error) {
    logError('Error fetching achievements', userId, error);
    return createErrorResponse('Failed to fetch achievements', 500);
  }
}

async function redeemReward(userId: string, data: any) {
  try {
    const { rewardId, pointsUsed } = data;

    if (!rewardId || !pointsUsed) {
      return createErrorResponse('Missing required fields: rewardId, pointsUsed', 400);
    }

    const result = await loyaltyService.redeemPoints(userId, rewardId, pointsUsed);

    if (result.success) {
      logger.info('Reward redeemed successfully', {
        userId,
        rewardId,
        pointsUsed,
        redemptionId: result.redemptionId,
      });

      return createSuccessResponse(
        { redemptionId: result.redemptionId },
        'Reward redeemed successfully',
        201
      );
    } else {
      return createErrorResponse(result.error || 'Failed to redeem reward', 400);
    }
  } catch (error) {
    logError('Error redeeming reward', userId, error);
    return createErrorResponse('Failed to redeem reward', 500);
  }
}

async function calculateTenurePoints(userId: string) {
  try {
    const calculation = await pointsCalculationEngine.calculateTenurePoints(userId);

    return createSuccessResponse(
      calculation,
      'Tenure points calculated and awarded',
      201
    );
  } catch (error) {
    logError('Error calculating tenure points', userId, error);
    return createErrorResponse('Failed to calculate tenure points', 500);
  }
}

async function createReferral(userId: string, data: any) {
  try {
    const { referredEmail } = data;

    if (!referredEmail) {
      return createErrorResponse('Missing required field: referredEmail', 400);
    }

    // Generate unique referral code
    const referralCode = await generateReferralCode(userId);

    // Create referral tracking record
    const { data: referral, error } = await supabase
      .from('referral_tracking')
      .insert({
        referrer_id: userId,
        referred_email: referredEmail,
        referral_code: referralCode,
        referral_status: 'invited',
        expires_at: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(), // 90 days
      })
      .select()
      .single();

    if (error) {
      logError('Error creating referral', userId, error);
      return createErrorResponse('Failed to create referral', 500);
    }

    logger.info('Referral created', {
      userId,
      referralId: referral.id,
      referralCode,
      referredEmail,
    });

    return createSuccessResponse(
      { referral, referralCode },
      'Referral created successfully',
      201
    );
  } catch (error) {
    logError('Error creating referral', userId, error);
    return createErrorResponse('Failed to create referral', 500);
  }
}

async function generateReferralCode(userId: string): Promise<string> {
  try {
    // Get user info for code generation
    const { data: profile } = await supabase
      .from('auth.users')
      .select('email')
      .eq('id', userId)
      .single();

    const emailPrefix = profile?.email?.split('@')[0] || 'USER';
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    
    let referralCode = `${emailPrefix.substring(0, 6)}${timestamp}${random}`.substring(0, 12);

    // Ensure uniqueness
    let attempts = 0;
    while (attempts < 10) {
      const { data: existing } = await supabase
        .from('referral_tracking')
        .select('id')
        .eq('referral_code', referralCode)
        .single();

      if (!existing) {
        break;
      }

      // Generate alternative code
      referralCode = `${emailPrefix.substring(0, 4)}${random}${timestamp}`.substring(0, 12);
      attempts++;
    }

    return referralCode;
  } catch (error) {
    logger.error('Error generating referral code', error);
    // Fallback to simple random code
    return Math.random().toString(36).substring(2, 14).toUpperCase();
  }
}