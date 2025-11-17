import { describe, it, expect, beforeEach, vi } from 'vitest';
import { loyaltyService } from '../lib/loyalty/index.ts';
import { pointsCalculationEngine } from '../lib/loyalty/points-engine.ts';
import { supabase } from '../lib/supabase.ts';

// Mock Supabase
vi.mock('../lib/supabase.ts', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(),
          order: vi.fn(() => ({
            limit: vi.fn(),
            range: vi.fn(),
          })),
        })),
        in: vi.fn(() => ({
          eq: vi.fn(),
        })),
        or: vi.fn(),
        order: vi.fn(),
        limit: vi.fn(),
        range: vi.fn(),
      })),
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(),
        })),
      })),
      update: vi.fn(() => ({
        eq: vi.fn(),
      })),
    })),
    rpc: vi.fn(),
  },
}));

// Mock logger
vi.mock('../lib/logger.ts', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
  },
}));

describe('LoyaltyService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getSettings', () => {
    it('should return default settings when database fails', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: null,
            error: new Error('Database error'),
          }),
        }),
      } as any);

      const settings = await loyaltyService.getSettings();

      expect(settings).toEqual({
        points_per_payment: 100,
        points_per_100k_spent: 10,
        points_per_month_tenure: 25,
        referral_base_points: 500,
        birthday_bonus_points: 200,
        anniversary_bonus_points: 500,
        points_expiry_months: 24,
        min_redemption_points: 100,
        max_redemption_percent: 50,
      });
    });

    it('should return settings from database', async () => {
      const mockSettings = [
        { setting_key: 'points_per_payment', setting_value: 150 },
        { setting_key: 'referral_base_points', setting_value: 750 },
      ];

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: mockSettings,
            error: null,
          }),
        }),
      } as any);

      const settings = await loyaltyService.getSettings();

      expect(settings.points_per_payment).toBe(150);
      expect(settings.referral_base_points).toBe(750);
    });
  });

  describe('getCustomerLoyaltyStatus', () => {
    it('should return customer loyalty status', async () => {
      const mockStatus = {
        id: 'status-id',
        user_id: 'user-id',
        current_points_balance: 1000,
        current_tier: {
          id: 'tier-id',
          name: 'silver',
          display_name: 'Silver',
          points_multiplier: 1.2,
        },
      };

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: mockStatus,
              error: null,
            }),
          }),
        }),
      } as any);

      const status = await loyaltyService.getCustomerLoyaltyStatus('user-id');

      expect(status).toEqual(mockStatus);
    });

    it('should return null when status not found', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { code: 'PGRST116' },
            }),
          }),
        }),
      } as any);

      const status = await loyaltyService.getCustomerLoyaltyStatus('user-id');

      expect(status).toBeNull();
    });
  });

  describe('addPoints', () => {
    it('should successfully add points', async () => {
      // Mock the RPC call to return success
      vi.mocked(supabase.rpc).mockResolvedValueOnce({
        data: null,
        error: null,
      });

      const result = await loyaltyService.addPoints(
        'user-id',
        100,
        'payment',
        'Test payment',
        'payment-id'
      );

      expect(result).toBe(true);
    });

    it('should return false on error', async () => {
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: null,
        error: new Error('RPC error'),
      });

      const result = await loyaltyService.addPoints(
        'user-id',
        100,
        'payment',
        'Test payment'
      );

      expect(result).toBe(false);
    });
  });

  describe('redeemPoints', () => {
    it('should successfully redeem points', async () => {
      const mockLoyaltyStatus = {
        id: 'status-id',
        current_points_balance: 1000,
        current_tier_id: 'tier-id',
      };

      const mockReward = {
        id: 'reward-id',
        name: 'Test Reward',
        points_cost: 500,
        is_active: true,
        is_limited: false,
      };

      const mockRedemption = {
        id: 'redemption-id',
        user_id: 'user-id',
        reward_id: 'reward-id',
        points_used: 500,
      };

      // Mock getCustomerLoyaltyStatus
      vi.spyOn(loyaltyService, 'getCustomerLoyaltyStatus').mockResolvedValue(
        mockLoyaltyStatus as any
      );

      // Mock reward lookup
      vi.mocked(supabase.from).mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: mockReward,
                error: null,
              }),
            }),
          }),
        }),
      } as any);

      // Mock redemption creation
      vi.mocked(supabase.from).mockReturnValueOnce({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: mockRedemption,
              error: null,
            }),
          }),
        }),
      } as any);

      // Mock other operations
      vi.mocked(supabase.from).mockReturnValue({
        insert: vi.fn().mockResolvedValue({ error: null }),
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null }),
        }),
      } as any);

      const result = await loyaltyService.redeemPoints(
        'user-id',
        'reward-id',
        500
      );

      expect(result.success).toBe(true);
      expect(result.redemptionId).toBe('redemption-id');
    });

    it('should fail with insufficient points', async () => {
      const mockLoyaltyStatus = {
        id: 'status-id',
        current_points_balance: 200, // Less than required
      };

      vi.spyOn(loyaltyService, 'getCustomerLoyaltyStatus').mockResolvedValue(
        mockLoyaltyStatus as any
      );

      const result = await loyaltyService.redeemPoints(
        'user-id',
        'reward-id',
        500
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Insufficient points balance');
    });
  });

  describe('calculatePaymentPoints', () => {
    it('should calculate points correctly', async () => {
      const mockSettings = {
        points_per_payment: 100,
        points_per_100k_spent: 10,
      };

      const mockLoyaltyStatus = {
        current_tier: {
          points_multiplier: 1.5,
        },
      };

      vi.spyOn(loyaltyService, 'getSettings').mockResolvedValue(
        mockSettings as any
      );
      vi.spyOn(loyaltyService, 'getCustomerLoyaltyStatus').mockResolvedValue(
        mockLoyaltyStatus as any
      );

      const points = await loyaltyService.calculatePaymentPoints(
        'user-id',
        500000
      );

      // Base: 100 + Spending: (500000/100000)*10 = 50 = 150
      // With multiplier: 150 * 1.5 = 225
      expect(points).toBe(225);
    });

    it('should return 0 on error', async () => {
      vi.spyOn(loyaltyService, 'getSettings').mockRejectedValue(
        new Error('Error')
      );

      const points = await loyaltyService.calculatePaymentPoints(
        'user-id',
        100000
      );

      expect(points).toBe(0);
    });
  });
});

describe('PointsCalculationEngine', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('calculatePaymentPoints', () => {
    it('should calculate and award payment points', async () => {
      vi.spyOn(loyaltyService, 'getSettings').mockResolvedValue({
        points_per_payment: 100,
        points_per_100k_spent: 10,
        points_expiry_months: 24,
      } as any);

      vi.spyOn(loyaltyService, 'getCustomerLoyaltyStatus').mockResolvedValue({
        current_tier: { points_multiplier: 1.2 },
      } as any);

      vi.spyOn(loyaltyService, 'addPoints').mockResolvedValue(true);
      vi.spyOn(loyaltyService, 'checkAndAwardAchievements').mockResolvedValue();

      vi.mocked(supabase.rpc).mockResolvedValue({ data: null, error: null });

      const result = await pointsCalculationEngine.calculatePaymentPoints(
        'user-id',
        500000,
        'payment-id'
      );

      expect(result.totalPoints).toBe(180);
      expect(loyaltyService.addPoints).toHaveBeenCalledWith(
        'user-id',
        180,
        'payment',
        expect.stringContaining('500.000'),
        'payment-id',
        expect.objectContaining({
          payment_amount: 500000,
          calculation: expect.any(Object),
        })
      );
    });
  });

  describe('calculateReferralPoints', () => {
    it('should calculate and award referral points', async () => {
      const mockLoyaltyStatus = {
        current_tier: { points_multiplier: 1.2 },
      };

      vi.spyOn(loyaltyService, 'getSettings').mockResolvedValue({
        referral_base_points: 500,
        points_expiry_months: 24,
      } as any);

      vi.spyOn(loyaltyService, 'getCustomerLoyaltyStatus').mockResolvedValue(
        mockLoyaltyStatus as any
      );
      vi.spyOn(loyaltyService, 'addPoints').mockResolvedValue(true);
      vi.spyOn(loyaltyService, 'checkAndAwardAchievements').mockResolvedValue();

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { referral_count: 3 },
              error: null,
            }),
          }),
        }),
      } as any);

      vi.mocked(supabase.rpc).mockResolvedValue({ data: null, error: null });

      const result = await pointsCalculationEngine.calculateReferralPoints(
        'referrer-id',
        'referred-id',
        'REF123'
      );

      expect(result.totalPoints).toBe(600); // 500 * 1.2
      expect(loyaltyService.addPoints).toHaveBeenCalledWith(
        'referrer-id',
        600,
        'referral',
        expect.stringContaining('referred-id'),
        'REF123',
        expect.any(Object)
      );
    });
  });

  describe('calculateTenurePoints', () => {
    it('should calculate tenure points with anniversary bonus', async () => {
      const mockLoyaltyStatus = {
        total_months_tenure: 12, // Anniversary month
      };

      vi.spyOn(loyaltyService, 'getSettings').mockResolvedValue({
        points_per_month_tenure: 25,
        anniversary_bonus_points: 500,
        birthday_bonus_points: 200,
      } as any);

      vi.spyOn(loyaltyService, 'getCustomerLoyaltyStatus').mockResolvedValue(
        mockLoyaltyStatus as any
      );
      vi.spyOn(loyaltyService, 'addPoints').mockResolvedValue(true);
      vi.spyOn(loyaltyService, 'checkAndAwardAchievements').mockResolvedValue();

      const result =
        await pointsCalculationEngine.calculateTenurePoints('user-id');

      expect(result.totalPoints).toBe(525); // 25 + 500
      expect(result.anniversaryBonus).toBe(500);
    });
  });

  describe('processPaymentWebhook', () => {
    it('should process successful payment webhook', async () => {
      const paymentData = {
        userId: 'user-id',
        amount: 100000,
        id: 'payment-id',
        status: 'success',
      };

      const spy = vi
        .spyOn(pointsCalculationEngine, 'calculatePaymentPoints')
        .mockResolvedValue({
          totalPoints: 120,
        } as any);

      await pointsCalculationEngine.processPaymentWebhook(paymentData);

      expect(spy).toHaveBeenCalledWith('user-id', 100000, 'payment-id');
    });

    it('should skip non-successful payments', async () => {
      const paymentData = {
        userId: 'user-id',
        amount: 100000,
        id: 'payment-id',
        status: 'failed',
      };

      const spy = vi
        .spyOn(pointsCalculationEngine, 'calculatePaymentPoints')
        .mockResolvedValue({
          totalPoints: 120,
        } as any);

      await pointsCalculationEngine.processPaymentWebhook(paymentData);

      expect(spy).not.toHaveBeenCalled();
    });
  });

  describe('expirePoints', () => {
    it('should process expired points', async () => {
      const expiredTransactions = [
        {
          id: 'trans1',
          user_id: 'user1',
          points_amount: 100,
        },
        {
          id: 'trans2',
          user_id: 'user2',
          points_amount: 50,
        },
      ];

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            lt: vi.fn().mockReturnValue({
              gt: vi.fn().mockResolvedValue({
                data: expiredTransactions,
                error: null,
              }),
            }),
          }),
        }),
      } as any);

      // Mock other database operations
      vi.mocked(supabase.from).mockReturnValue({
        insert: vi.fn().mockResolvedValue({ error: null }),
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null }),
        }),
      } as any);

      vi.spyOn(loyaltyService, 'getCustomerLoyaltyStatus').mockResolvedValue({
        current_points_balance: 200,
      } as any);

      await pointsCalculationEngine.expirePoints();

      expect(supabase.from).toHaveBeenCalledWith('loyalty_points_transactions');
    });
  });
});
