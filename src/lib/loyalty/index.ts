import { supabase } from '../supabase.ts';
import { logger } from '../logger.ts';

export interface LoyaltyTier {
  id: string;
  name: string;
  display_name: string;
  description: string;
  min_points: number;
  min_months_tenure: number;
  min_total_spent: number;
  points_multiplier: number;
  benefits: Record<string, any>;
  icon: string;
  color: string;
  is_active: boolean;
  sort_order: number;
}

export interface CustomerLoyaltyStatus {
  id: string;
  user_id: string;
  current_tier_id: string;
  total_points_earned: number;
  total_points_redeemed: number;
  current_points_balance: number;
  total_months_tenure: number;
  total_spent: number;
  referral_count: number;
  last_activity_at: string;
  tier_updated_at: string;
  current_tier?: LoyaltyTier;
}

export interface PointsTransaction {
  id: string;
  user_id: string;
  transaction_type: 'earned' | 'redeemed' | 'expired' | 'adjusted';
  points_amount: number;
  balance_after: number;
  source_type:
    | 'payment'
    | 'referral'
    | 'bonus'
    | 'redemption'
    | 'adjustment'
    | 'expiry';
  source_id?: string;
  description: string;
  metadata: Record<string, any>;
  expires_at?: string;
  created_at: string;
}

export interface Reward {
  id: string;
  name: string;
  description: string;
  category: string;
  points_cost: number;
  reward_type:
    | 'service_credit'
    | 'plan_upgrade'
    | 'addon'
    | 'partner_discount'
    | 'merchandise';
  reward_value: Record<string, any>;
  image_url?: string;
  is_active: boolean;
  is_limited: boolean;
  quantity_available?: number;
  quantity_claimed: number;
  min_tier_id?: string;
  starts_at: string;
  ends_at?: string;
  terms_conditions?: string;
}

export interface RewardRedemption {
  id: string;
  user_id: string;
  reward_id: string;
  points_used: number;
  redemption_status:
    | 'pending'
    | 'approved'
    | 'fulfilled'
    | 'expired'
    | 'cancelled';
  fulfillment_data: Record<string, any>;
  notes?: string;
  expires_at?: string;
  fulfilled_at?: string;
  created_at: string;
  reward?: Reward;
}

export interface ReferralTracking {
  id: string;
  referrer_id: string;
  referred_email: string;
  referred_user_id?: string;
  referral_code: string;
  referral_status:
    | 'invited'
    | 'registered'
    | 'activated'
    | 'completed'
    | 'expired';
  points_awarded: number;
  bonus_milestones: Record<string, any>;
  invitation_sent_at: string;
  registered_at?: string;
  activated_at?: string;
  completed_at?: string;
  expires_at?: string;
}

export interface LoyaltySettings {
  points_per_payment: number;
  points_per_100k_spent: number;
  points_per_month_tenure: number;
  referral_base_points: number;
  birthday_bonus_points: number;
  anniversary_bonus_points: number;
  points_expiry_months: number;
  min_redemption_points: number;
  max_redemption_percent: number;
}

export interface Achievement {
  id: string;
  name: string;
  display_name: string;
  description: string;
  icon: string;
  badge_type: 'milestone' | 'streak' | 'tier' | 'referral' | 'payment';
  criteria: Record<string, any>;
  points_award: number;
  is_active: boolean;
}

export interface CustomerAchievement {
  id: string;
  user_id: string;
  achievement_id: string;
  earned_at: string;
  metadata: Record<string, any>;
  achievement?: Achievement;
}

class LoyaltyService {
  private settings: LoyaltySettings | null = null;

  async getSettings(): Promise<LoyaltySettings> {
    if (this.settings) {
      return this.settings;
    }

    try {
      const { data, error } = await supabase
        .from('loyalty_settings')
        .select('setting_key, setting_value')
        .eq('is_active', true);

      if (error) {
        logger.error('Error fetching loyalty settings', error);
        throw error;
      }

      this.settings =
        data?.reduce((acc, setting) => {
          acc[setting.setting_key as keyof LoyaltySettings] =
            setting.setting_value;
          return acc;
        }, {} as LoyaltySettings) || this.getDefaultSettings();

      return this.settings!;
    } catch (error) {
      logger.error('Failed to get loyalty settings', error);
      return this.getDefaultSettings();
    }
  }

  private getDefaultSettings(): LoyaltySettings {
    return {
      points_per_payment: 100,
      points_per_100k_spent: 10,
      points_per_month_tenure: 25,
      referral_base_points: 500,
      birthday_bonus_points: 200,
      anniversary_bonus_points: 500,
      points_expiry_months: 24,
      min_redemption_points: 100,
      max_redemption_percent: 50,
    };
  }

  async getCustomerLoyaltyStatus(
    userId: string
  ): Promise<CustomerLoyaltyStatus | null> {
    try {
      const { data, error } = await supabase
        .from('customer_loyalty_status')
        .select(
          `
          *,
          current_tier:loyalty_tiers(*)
        `
        )
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') {
        logger.error('Error fetching customer loyalty status', error);
        throw error;
      }

      return data;
    } catch (error) {
      logger.error('Failed to get customer loyalty status', error);
      return null;
    }
  }

  async getLoyaltyTiers(): Promise<LoyaltyTier[]> {
    try {
      const { data, error } = await supabase
        .from('loyalty_tiers')
        .select('*')
        .eq('is_active', true)
        .order('sort_order');

      if (error) {
        logger.error('Error fetching loyalty tiers', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      logger.error('Failed to get loyalty tiers', error);
      return [];
    }
  }

  async getPointsTransactions(
    userId: string,
    options: {
      limit?: number;
      offset?: number;
      type?: string;
      source_type?: string;
    } = {}
  ): Promise<{ transactions: PointsTransaction[]; total: number }> {
    try {
      let query = supabase
        .from('loyalty_points_transactions')
        .select('*', { count: 'exact' })
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (options.type) {
        query = query.eq('transaction_type', options.type);
      }

      if (options.source_type) {
        query = query.eq('source_type', options.source_type);
      }

      if (options.limit) {
        query = query.limit(options.limit);
      }

      if (options.offset) {
        query = query.range(
          options.offset,
          options.offset + (options.limit || 10) - 1
        );
      }

      const { data, error, count } = await query;

      if (error) {
        logger.error('Error fetching points transactions', error);
        throw error;
      }

      return {
        transactions: data || [],
        total: count || 0,
      };
    } catch (error) {
      logger.error('Failed to get points transactions', error);
      return { transactions: [], total: 0 };
    }
  }

  async getRewardsCatalog(
    options: {
      category?: string;
      min_tier?: string;
      user_points?: number;
    } = {}
  ): Promise<Reward[]> {
    try {
      let query = supabase
        .from('rewards_catalog')
        .select('*')
        .eq('is_active', true)
        .order('points_cost', { ascending: true });

      if (options.category) {
        query = query.eq('category', options.category);
      }

      if (options.min_tier) {
        query = query.or(
          `min_tier_id.is.null,min_tier_id.eq.${options.min_tier}`
        );
      }

      const { data, error } = await query;

      if (error) {
        logger.error('Error fetching rewards catalog', error);
        throw error;
      }

      // Filter out rewards that user can't afford
      let rewards = data || [];
      if (options.user_points !== undefined) {
        rewards = rewards.filter(
          reward => reward.points_cost <= options.user_points!
        );
      }

      return rewards;
    } catch (error) {
      logger.error('Failed to get rewards catalog', error);
      return [];
    }
  }

  async getRewardRedemptions(
    userId: string,
    options: {
      limit?: number;
      offset?: number;
      status?: string;
    } = {}
  ): Promise<{ redemptions: RewardRedemption[]; total: number }> {
    try {
      let query = supabase
        .from('reward_redemptions')
        .select(
          `
          *,
          reward:rewards_catalog(*)
        `,
          { count: 'exact' }
        )
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (options.status) {
        query = query.eq('redemption_status', options.status);
      }

      if (options.limit) {
        query = query.limit(options.limit);
      }

      if (options.offset) {
        query = query.range(
          options.offset,
          options.offset + (options.limit || 10) - 1
        );
      }

      const { data, error, count } = await query;

      if (error) {
        logger.error('Error fetching reward redemptions', error);
        throw error;
      }

      return {
        redemptions: data || [],
        total: count || 0,
      };
    } catch (error) {
      logger.error('Failed to get reward redemptions', error);
      return { redemptions: [], total: 0 };
    }
  }

  async getReferrals(userId: string): Promise<ReferralTracking[]> {
    try {
      const { data, error } = await supabase
        .from('referral_tracking')
        .select('*')
        .eq('referrer_id', userId)
        .order('invitation_sent_at', { ascending: false });

      if (error) {
        logger.error('Error fetching referrals', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      logger.error('Failed to get referrals', error);
      return [];
    }
  }

  async getAchievements(): Promise<Achievement[]> {
    try {
      const { data, error } = await supabase
        .from('loyalty_achievements')
        .select('*')
        .eq('is_active', true)
        .order('created_at');

      if (error) {
        logger.error('Error fetching achievements', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      logger.error('Failed to get achievements', error);
      return [];
    }
  }

  async getCustomerAchievements(
    userId: string
  ): Promise<CustomerAchievement[]> {
    try {
      const { data, error } = await supabase
        .from('customer_achievements')
        .select(
          `
          *,
          achievement:loyalty_achievements(*)
        `
        )
        .eq('user_id', userId)
        .order('earned_at', { ascending: false });

      if (error) {
        logger.error('Error fetching customer achievements', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      logger.error('Failed to get customer achievements', error);
      return [];
    }
  }

  async addPoints(
    userId: string,
    points: number,
    sourceType: string,
    description: string,
    sourceId?: string,
    metadata: Record<string, any> = {}
  ): Promise<boolean> {
    try {
      const settings = await this.getSettings();
      const expiresAt = new Date();
      expiresAt.setMonth(expiresAt.getMonth() + settings.points_expiry_months);

      const { error } = await supabase.rpc('add_loyalty_points', {
        p_user_id: userId,
        p_points: points,
        p_source_type: sourceType,
        p_source_id: sourceId,
        p_description: description,
        p_metadata: metadata,
        p_expires_at: expiresAt.toISOString(),
      });

      if (error) {
        logger.error('Error adding loyalty points', error);
        throw error;
      }

      logger.info('Loyalty points added', {
        userId,
        points,
        sourceType,
        description,
      });

      return true;
    } catch (error) {
      logger.error('Failed to add loyalty points', error);
      return false;
    }
  }

  async redeemPoints(
    userId: string,
    rewardId: string,
    pointsUsed: number
  ): Promise<{ success: boolean; redemptionId?: string; error?: string }> {
    try {
      // Get customer loyalty status
      const loyaltyStatus = await this.getCustomerLoyaltyStatus(userId);
      if (!loyaltyStatus) {
        return { success: false, error: 'Customer loyalty status not found' };
      }

      // Check if user has enough points
      if (loyaltyStatus.current_points_balance < pointsUsed) {
        return { success: false, error: 'Insufficient points balance' };
      }

      // Get reward details
      const { data: reward, error: rewardError } = await supabase
        .from('rewards_catalog')
        .select('*')
        .eq('id', rewardId)
        .eq('is_active', true)
        .single();

      if (rewardError || !reward) {
        return { success: false, error: 'Reward not found or inactive' };
      }

      // Check if reward is still available
      if (
        reward.is_limited &&
        reward.quantity_available &&
        reward.quantity_claimed >= reward.quantity_available
      ) {
        return { success: false, error: 'Reward no longer available' };
      }

      // Check if user meets minimum tier requirement
      if (
        reward.min_tier_id &&
        loyaltyStatus.current_tier_id !== reward.min_tier_id
      ) {
        return {
          success: false,
          error: 'Does not meet minimum tier requirement',
        };
      }

      // Start transaction
      const { data: redemption, error: redemptionError } = await supabase
        .from('reward_redemptions')
        .insert({
          user_id: userId,
          reward_id: rewardId,
          points_used: pointsUsed,
          redemption_status: 'pending',
          expires_at: new Date(
            Date.now() + 30 * 24 * 60 * 60 * 1000
          ).toISOString(), // 30 days
        })
        .select()
        .single();

      if (redemptionError || !redemption) {
        return { success: false, error: 'Failed to create redemption' };
      }

      // Deduct points
      const newBalance = loyaltyStatus.current_points_balance - pointsUsed;

      // Add points transaction
      const { error: transactionError } = await supabase
        .from('loyalty_points_transactions')
        .insert({
          user_id: userId,
          transaction_type: 'redeemed',
          points_amount: -pointsUsed,
          balance_after: newBalance,
          source_type: 'redemption',
          source_id: redemption.id,
          description: `Redeemed ${reward.name}`,
          metadata: { reward_id: rewardId, reward_name: reward.name },
        });

      if (transactionError) {
        return { success: false, error: 'Failed to record points transaction' };
      }

      // Update customer loyalty status
      const { error: statusError } = await supabase
        .from('customer_loyalty_status')
        .update({
          current_points_balance: newBalance,
          total_points_redeemed:
            loyaltyStatus.total_points_redeemed + pointsUsed,
          last_activity_at: new Date().toISOString(),
        })
        .eq('user_id', userId);

      if (statusError) {
        return { success: false, error: 'Failed to update loyalty status' };
      }

      // Update reward claimed count
      await supabase
        .from('rewards_catalog')
        .update({
          quantity_claimed: reward.quantity_claimed + 1,
        })
        .eq('id', rewardId);

      logger.info('Points redeemed successfully', {
        userId,
        rewardId,
        pointsUsed,
        redemptionId: redemption.id,
      });

      return { success: true, redemptionId: redemption.id };
    } catch (error) {
      logger.error('Failed to redeem points', error);
      return { success: false, error: 'Internal server error' };
    }
  }

  async calculatePaymentPoints(
    paymentAmount: number,
    userId: string
  ): Promise<number> {
    try {
      const settings = await this.getSettings();
      const loyaltyStatus = await this.getCustomerLoyaltyStatus(userId);

      // Base points for payment
      let points = settings.points_per_payment;

      // Points based on amount spent
      points += Math.floor(
        (paymentAmount / 100000) * settings.points_per_100k_spent
      );

      // Apply tier multiplier
      if (loyaltyStatus?.current_tier) {
        points = Math.floor(
          points * loyaltyStatus.current_tier.points_multiplier
        );
      }

      return points;
    } catch (error) {
      logger.error('Failed to calculate payment points', error);
      return 0;
    }
  }

  async checkAndAwardAchievements(userId: string): Promise<void> {
    try {
      const loyaltyStatus = await this.getCustomerLoyaltyStatus(userId);
      if (!loyaltyStatus) return;

      const achievements = await this.getAchievements();
      const customerAchievements = await this.getCustomerAchievements(userId);
      const earnedAchievementIds = new Set(
        customerAchievements.map(ca => ca.achievement_id)
      );

      for (const achievement of achievements) {
        if (earnedAchievementIds.has(achievement.id)) continue;

        const isEligible = await this.checkAchievementEligibility(
          userId,
          achievement,
          loyaltyStatus
        );

        if (isEligible) {
          await this.awardAchievement(
            userId,
            achievement.id,
            achievement.points_award
          );
        }
      }
    } catch (error) {
      logger.error('Failed to check and award achievements', error);
    }
  }

  private async checkAchievementEligibility(
    userId: string,
    achievement: Achievement,
    loyaltyStatus: CustomerLoyaltyStatus
  ): Promise<boolean> {
    const criteria = achievement.criteria;

    switch (achievement.badge_type) {
      case 'payment': {
        // Check payment count
        const { count: paymentCount } = await supabase
          .from('payment_transactions')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userId)
          .eq('status', 'success');

        return paymentCount >= (criteria.payments_count || 0);
      }

      case 'milestone':
        if (criteria.months_tenure) {
          return loyaltyStatus.total_months_tenure >= criteria.months_tenure;
        }
        if (criteria.total_points) {
          return loyaltyStatus.total_points_earned >= criteria.total_points;
        }
        if (criteria.referral_count) {
          return loyaltyStatus.referral_count >= criteria.referral_count;
        }
        break;

      case 'referral':
        return loyaltyStatus.referral_count >= (criteria.referral_count || 0);

      default:
        return false;
    }

    return false;
  }

  private async awardAchievement(
    userId: string,
    achievementId: string,
    pointsAward: number
  ): Promise<void> {
    try {
      // Add achievement to customer
      await supabase.from('customer_achievements').insert({
        user_id: userId,
        achievement_id: achievementId,
      });

      // Award points if applicable
      if (pointsAward > 0) {
        await this.addPoints(
          userId,
          pointsAward,
          'bonus',
          `Achievement unlocked: ${achievementId}`,
          undefined,
          { achievement_id: achievementId }
        );
      }

      logger.info('Achievement awarded', {
        userId,
        achievementId,
        pointsAward,
      });
    } catch (error) {
      logger.error('Failed to award achievement', error);
    }
  }
}

export const loyaltyService = new LoyaltyService();
