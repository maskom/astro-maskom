import { loyaltyService } from './index.ts';
import { supabase } from '../supabase.ts';
import { logger } from '../logger.ts';

export interface PaymentPointsCalculation {
  basePoints: number;
  spendingPoints: number;
  tierMultiplier: number;
  totalPoints: number;
  breakdown: {
    paymentBonus: number;
    spendingRatio: number;
    tierBonus: number;
  };
}

export interface ReferralPointsCalculation {
  basePoints: number;
  milestoneBonus: number;
  tierMultiplier: number;
  totalPoints: number;
  milestones: {
    count: number;
    bonus: number;
  }[];
}

export interface TenurePointsCalculation {
  monthlyPoints: number;
  anniversaryBonus: number;
  birthdayBonus: number;
  totalPoints: number;
}

class PointsCalculationEngine {
  async calculatePaymentPoints(
    userId: string,
    paymentAmount: number,
    paymentId: string
  ): Promise<PaymentPointsCalculation> {
    try {
      const settings = await loyaltyService.getSettings();
      const loyaltyStatus =
        await loyaltyService.getCustomerLoyaltyStatus(userId);

      // Base points for making a payment
      const basePoints = settings.points_per_payment;

      // Points based on spending amount
      const spendingPoints = Math.floor(
        (paymentAmount / 100000) * settings.points_per_100k_spent
      );

      // Apply tier multiplier
      const tierMultiplier =
        loyaltyStatus?.current_tier?.points_multiplier || 1.0;

      // Calculate total points
      const subtotalPoints = basePoints + spendingPoints;
      const totalPoints = Math.floor(subtotalPoints * tierMultiplier);

      const calculation: PaymentPointsCalculation = {
        basePoints,
        spendingPoints,
        tierMultiplier,
        totalPoints,
        breakdown: {
          paymentBonus: basePoints,
          spendingRatio: spendingPoints,
          tierBonus: Math.floor(subtotalPoints * (tierMultiplier - 1)),
        },
      };

      // Award the points
      if (totalPoints > 0) {
        await loyaltyService.addPoints(
          userId,
          totalPoints,
          'payment',
          `Points earned from payment of ${new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
          }).format(paymentAmount)}`,
          paymentId,
          {
            payment_amount: paymentAmount,
            calculation: calculation.breakdown,
          }
        );

        // Update customer spending total
        await this.updateCustomerSpending(userId, paymentAmount);

        // Check for achievements
        await loyaltyService.checkAndAwardAchievements(userId);
      }

      logger.info('Payment points calculated and awarded', {
        userId,
        paymentId,
        paymentAmount,
        totalPoints,
        calculation,
      });

      return calculation;
    } catch (error) {
      logger.error('Failed to calculate payment points', error);
      throw error;
    }
  }

  async calculateReferralPoints(
    referrerId: string,
    referredUserId: string,
    referralCode: string
  ): Promise<ReferralPointsCalculation> {
    try {
      const settings = await loyaltyService.getSettings();
      const loyaltyStatus =
        await loyaltyService.getCustomerLoyaltyStatus(referrerId);

      // Base referral points
      const basePoints = settings.referral_base_points;

      // Calculate milestone bonuses
      const referralCount = await this.getReferralCount(referrerId);
      const milestones = this.calculateReferralMilestones(referralCount);
      const milestoneBonus = milestones.reduce(
        (sum, milestone) => sum + milestone.bonus,
        0
      );

      // Apply tier multiplier
      const tierMultiplier =
        loyaltyStatus?.current_tier?.points_multiplier || 1.0;

      // Calculate total points
      const subtotalPoints = basePoints + milestoneBonus;
      const totalPoints = Math.floor(subtotalPoints * tierMultiplier);

      const calculation: ReferralPointsCalculation = {
        basePoints,
        milestoneBonus,
        tierMultiplier,
        totalPoints,
        milestones,
      };

      // Award the points
      if (totalPoints > 0) {
        await loyaltyService.addPoints(
          referrerId,
          totalPoints,
          'referral',
          `Referral bonus for ${referredUserId}`,
          referralCode,
          {
            referred_user_id: referredUserId,
            referral_code: referralCode,
            calculation: calculation,
          }
        );

        // Update referral count
        await this.updateReferralCount(referrerId);

        // Update referral tracking
        await this.updateReferralTracking(
          referralCode,
          referredUserId,
          'completed',
          totalPoints
        );

        // Check for achievements
        await loyaltyService.checkAndAwardAchievements(referrerId);
      }

      logger.info('Referral points calculated and awarded', {
        referrerId,
        referredUserId,
        referralCode,
        totalPoints,
        calculation,
      });

      return calculation;
    } catch (error) {
      logger.error('Failed to calculate referral points', error);
      throw error;
    }
  }

  async calculateTenurePoints(
    userId: string
  ): Promise<TenurePointsCalculation> {
    try {
      const settings = await loyaltyService.getSettings();
      const loyaltyStatus =
        await loyaltyService.getCustomerLoyaltyStatus(userId);

      if (!loyaltyStatus) {
        throw new Error('Customer loyalty status not found');
      }

      // Monthly tenure points
      const monthlyPoints = settings.points_per_month_tenure;

      // Check for anniversary bonus (yearly)
      const monthsSinceStart = loyaltyStatus.total_months_tenure;
      const anniversaryBonus =
        monthsSinceStart > 0 && monthsSinceStart % 12 === 0
          ? settings.anniversary_bonus_points
          : 0;

      // Check for birthday bonus (would need user profile data)
      const birthdayBonus = await this.checkBirthdayBonus(userId);

      const totalPoints = monthlyPoints + anniversaryBonus + birthdayBonus;

      const calculation: TenurePointsCalculation = {
        monthlyPoints,
        anniversaryBonus,
        birthdayBonus,
        totalPoints,
      };

      // Award the points if it's a new month or special occasion
      if (totalPoints > 0) {
        let description = 'Monthly tenure points';
        if (anniversaryBonus > 0) description += ' with anniversary bonus';
        if (birthdayBonus > 0) description += ' with birthday bonus';

        await loyaltyService.addPoints(
          userId,
          totalPoints,
          'bonus',
          description,
          undefined,
          {
            calculation: calculation,
            months_tenure: monthsSinceStart,
          }
        );

        // Check for achievements
        await loyaltyService.checkAndAwardAchievements(userId);
      }

      logger.info('Tenure points calculated and awarded', {
        userId,
        totalPoints,
        calculation,
      });

      return calculation;
    } catch (error) {
      logger.error('Failed to calculate tenure points', error);
      throw error;
    }
  }

  async processPaymentWebhook(paymentData: any): Promise<void> {
    try {
      const { userId, amount, id: paymentId, status } = paymentData;

      if (status !== 'success') {
        logger.info('Skipping points calculation for non-successful payment', {
          paymentId,
          status,
        });
        return;
      }

      await this.calculatePaymentPoints(userId, amount, paymentId);
    } catch (error) {
      logger.error('Failed to process payment webhook for points', error);
    }
  }

  async processReferralWebhook(referralData: any): Promise<void> {
    try {
      const { referrerId, referredUserId, referralCode, status } = referralData;

      if (status !== 'completed') {
        logger.info('Skipping points calculation for incomplete referral', {
          referralCode,
          status,
        });
        return;
      }

      await this.calculateReferralPoints(
        referrerId,
        referredUserId,
        referralCode
      );
    } catch (error) {
      logger.error('Failed to process referral webhook for points', error);
    }
  }

  async expirePoints(): Promise<void> {
    try {
      const settings = await loyaltyService.getSettings();
      const expiryDate = new Date();
      expiryDate.setMonth(
        expiryDate.getMonth() - settings.points_expiry_months
      );

      // Find expired points transactions
      const { data: expiredTransactions, error } = await supabase
        .from('loyalty_points_transactions')
        .select('*')
        .eq('transaction_type', 'earned')
        .lt('expires_at', expiryDate.toISOString())
        .gt('points_amount', 0);

      if (error) {
        logger.error('Error finding expired points transactions', error);
        return;
      }

      // Group by user and calculate total expired points per user
      const expiredByUser =
        expiredTransactions?.reduce(
          (acc, transaction) => {
            const userId = transaction.user_id;
            if (!acc[userId]) {
              acc[userId] = {
                totalPoints: 0,
                transactions: [],
              };
            }
            acc[userId].totalPoints += transaction.points_amount;
            acc[userId].transactions.push(transaction);
            return acc;
          },
          {} as Record<string, { totalPoints: number; transactions: any[] }>
        ) || {};

      // Process expirations for each user
      for (const [userId, expiredData] of Object.entries(expiredByUser)) {
        await this.processPointsExpiry(
          userId,
          expiredData.totalPoints,
          expiredData.transactions
        );
      }

      logger.info('Points expiry processing completed', {
        expiredUsers: Object.keys(expiredByUser).length,
        totalExpiredTransactions: expiredTransactions?.length || 0,
      });
    } catch (error) {
      logger.error('Failed to process points expiry', error);
    }
  }

  private async updateCustomerSpending(
    userId: string,
    amount: number
  ): Promise<void> {
    try {
      await supabase.rpc('update_customer_spending', {
        p_user_id: userId,
        p_amount: amount,
      });
    } catch (error) {
      logger.error('Failed to update customer spending', error);
    }
  }

  private async updateReferralCount(userId: string): Promise<void> {
    try {
      await supabase.rpc('update_referral_count', {
        p_user_id: userId,
      });
    } catch (error) {
      logger.error('Failed to update referral count', error);
    }
  }

  private async updateReferralTracking(
    referralCode: string,
    referredUserId: string,
    status: string,
    pointsAwarded: number
  ): Promise<void> {
    try {
      await supabase
        .from('referral_tracking')
        .update({
          referred_user_id: referredUserId,
          referral_status: status,
          points_awarded: pointsAwarded,
          completed_at: new Date().toISOString(),
        })
        .eq('referral_code', referralCode);
    } catch (error) {
      logger.error('Failed to update referral tracking', error);
    }
  }

  private async getReferralCount(userId: string): Promise<number> {
    try {
      const { data, error } = await supabase
        .from('customer_loyalty_status')
        .select('referral_count')
        .eq('user_id', userId)
        .single();

      return data?.referral_count || 0;
    } catch (err) {
      logger.error('Failed to get referral count', err);
      return 0;
    }
  }

  private calculateReferralMilestones(
    referralCount: number
  ): { count: number; bonus: number }[] {
    const milestones = [
      { count: 5, bonus: 500 },
      { count: 10, bonus: 1000 },
      { count: 25, bonus: 2500 },
      { count: 50, bonus: 5000 },
      { count: 100, bonus: 10000 },
    ];

    return milestones.filter(milestone => referralCount >= milestone.count);
  }

  private async checkBirthdayBonus(_userId: string): Promise<number> {
    try {
      // This would typically check against user profile data
      // For now, we'll return 0 as we don't have user profile access
      // In a real implementation, you'd check if today is the user's birthday
      return 0;
    } catch (error) {
      logger.error('Failed to check birthday bonus', error);
      return 0;
    }
  }

  private async processPointsExpiry(
    userId: string,
    totalExpiredPoints: number,
    expiredTransactions: any[]
  ): Promise<void> {
    try {
      // Get current balance
      const loyaltyStatus =
        await loyaltyService.getCustomerLoyaltyStatus(userId);
      if (!loyaltyStatus) return;

      // Calculate new balance after expiry
      const newBalance = Math.max(
        0,
        loyaltyStatus.current_points_balance - totalExpiredPoints
      );

      // Add expiry transaction
      await supabase.from('loyalty_points_transactions').insert({
        user_id: userId,
        transaction_type: 'expired',
        points_amount: -totalExpiredPoints,
        balance_after: newBalance,
        source_type: 'expiry',
        description: `Points expired: ${totalExpiredPoints} points`,
        metadata: {
          expired_transactions: expiredTransactions.map(t => t.id),
        },
      });

      // Update customer loyalty status
      await supabase
        .from('customer_loyalty_status')
        .update({
          current_points_balance: newBalance,
          last_activity_at: new Date().toISOString(),
        })
        .eq('user_id', userId);

      logger.info('Points expired for user', {
        userId,
        totalExpiredPoints,
        newBalance,
      });
    } catch (error) {
      logger.error('Failed to process points expiry for user', error);
    }
  }
}

export const pointsCalculationEngine = new PointsCalculationEngine();
