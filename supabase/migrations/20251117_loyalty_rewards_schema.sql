-- Customer Loyalty and Rewards Program Schema
-- This migration creates tables for loyalty points, tiers, rewards, referrals, and settings

-- Loyalty Tiers Table
CREATE TABLE IF NOT EXISTS loyalty_tiers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(50) NOT NULL UNIQUE,
    display_name VARCHAR(100) NOT NULL,
    description TEXT,
    min_points INTEGER NOT NULL DEFAULT 0,
    min_months_tenure INTEGER NOT NULL DEFAULT 0,
    min_total_spent DECIMAL(12,2) NOT NULL DEFAULT 0,
    points_multiplier DECIMAL(3,2) NOT NULL DEFAULT 1.0,
    benefits JSONB DEFAULT '{}',
    icon VARCHAR(100),
    color VARCHAR(20),
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Customer Loyalty Status Table
CREATE TABLE IF NOT EXISTS customer_loyalty_status (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    current_tier_id UUID REFERENCES loyalty_tiers(id),
    total_points_earned INTEGER NOT NULL DEFAULT 0,
    total_points_redeemed INTEGER NOT NULL DEFAULT 0,
    current_points_balance INTEGER NOT NULL DEFAULT 0,
    total_months_tenure INTEGER NOT NULL DEFAULT 0,
    total_spent DECIMAL(12,2) NOT NULL DEFAULT 0,
    referral_count INTEGER NOT NULL DEFAULT 0,
    last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    tier_updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Loyalty Points Transactions Table
CREATE TABLE IF NOT EXISTS loyalty_points_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    transaction_type VARCHAR(50) NOT NULL CHECK (transaction_type IN ('earned', 'redeemed', 'expired', 'adjusted')),
    points_amount INTEGER NOT NULL,
    balance_after INTEGER NOT NULL,
    source_type VARCHAR(50) NOT NULL CHECK (source_type IN ('payment', 'referral', 'bonus', 'redemption', 'adjustment', 'expiry')),
    source_id UUID, -- Reference to payment, referral, etc.
    description TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Rewards Catalog Table
CREATE TABLE IF NOT EXISTS rewards_catalog (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(200) NOT NULL,
    description TEXT,
    category VARCHAR(50) NOT NULL,
    points_cost INTEGER NOT NULL,
    reward_type VARCHAR(50) NOT NULL CHECK (reward_type IN ('service_credit', 'plan_upgrade', 'addon', 'partner_discount', 'merchandise')),
    reward_value JSONB NOT NULL, -- Flexible structure for different reward types
    image_url VARCHAR(500),
    is_active BOOLEAN DEFAULT true,
    is_limited BOOLEAN DEFAULT false,
    quantity_available INTEGER,
    quantity_claimed INTEGER NOT NULL DEFAULT 0,
    min_tier_id UUID REFERENCES loyalty_tiers(id),
    starts_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ends_at TIMESTAMP WITH TIME ZONE,
    terms_conditions TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Reward Redemptions Table
CREATE TABLE IF NOT EXISTS reward_redemptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    reward_id UUID REFERENCES rewards_catalog(id),
    points_used INTEGER NOT NULL,
    redemption_status VARCHAR(50) NOT NULL CHECK (redemption_status IN ('pending', 'approved', 'fulfilled', 'expired', 'cancelled')),
    fulfillment_data JSONB DEFAULT '{}',
    notes TEXT,
    expires_at TIMESTAMP WITH TIME ZONE,
    fulfilled_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enhanced Referral Tracking Table
CREATE TABLE IF NOT EXISTS referral_tracking (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    referrer_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    referred_email VARCHAR(255) NOT NULL,
    referred_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    referral_code VARCHAR(20) NOT NULL,
    referral_status VARCHAR(50) NOT NULL CHECK (referral_status IN ('invited', 'registered', 'activated', 'completed', 'expired')),
    points_awarded INTEGER NOT NULL DEFAULT 0,
    bonus_milestones JSONB DEFAULT '{}', -- Track milestone bonuses
    invitation_sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    registered_at TIMESTAMP WITH TIME ZONE,
    activated_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Loyalty Settings Table
CREATE TABLE IF NOT EXISTS loyalty_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    setting_key VARCHAR(100) NOT NULL UNIQUE,
    setting_value JSONB NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Loyalty Achievements/Badges Table
CREATE TABLE IF NOT EXISTS loyalty_achievements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    display_name VARCHAR(200) NOT NULL,
    description TEXT,
    icon VARCHAR(100),
    badge_type VARCHAR(50) NOT NULL CHECK (badge_type IN ('milestone', 'streak', 'tier', 'referral', 'payment')),
    criteria JSONB NOT NULL, -- Flexible criteria structure
    points_award INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Customer Achievements Table
CREATE TABLE IF NOT EXISTS customer_achievements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    achievement_id UUID REFERENCES loyalty_achievements(id),
    earned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB DEFAULT '{}',
    UNIQUE(user_id, achievement_id)
);

-- Insert default loyalty tiers
INSERT INTO loyalty_tiers (name, display_name, description, min_points, min_months_tenure, min_total_spent, points_multiplier, benefits, icon, color, sort_order) VALUES
('bronze', 'Bronze', 'Starting tier for all new customers', 0, 0, 0, 1.0, '{"support_priority": "standard", "referral_bonus": 500}', 'medal', '#CD7F32', 1),
('silver', 'Silver', 'Dedicated customers with growing loyalty', 1000, 6, 500000, 1.2, '{"support_priority": "priority", "referral_bonus": 750, "monthly_bonus": 50}', 'medal', '#C0C0C0', 2),
('gold', 'Gold', 'Valued long-term customers', 5000, 12, 2000000, 1.5, '{"support_priority": "vip", "referral_bonus": 1000, "monthly_bonus": 100, "exclusive_offers": true}', 'medal', '#FFD700', 3),
('platinum', 'Platinum', 'Elite customers with exceptional loyalty', 15000, 24, 5000000, 2.0, '{"support_priority": "dedicated", "referral_bonus": 1500, "monthly_bonus": 200, "exclusive_offers": true, "personal_manager": true}', 'medal', '#E5E4E2', 4)
ON CONFLICT (name) DO NOTHING;

-- Insert default loyalty settings
INSERT INTO loyalty_settings (setting_key, setting_value, description) VALUES
('points_per_payment', '100', 'Points earned per successful payment'),
('points_per_100k_spent', '10', 'Points earned per 100,000 spent'),
('points_per_month_tenure', '25', 'Points earned per month of tenure'),
('referral_base_points', '500', 'Base points awarded for successful referral'),
('birthday_bonus_points', '200', 'Bonus points awarded on customer birthday'),
('anniversary_bonus_points', '500', 'Bonus points awarded on service anniversary'),
('points_expiry_months', '24', 'Months after which points expire'),
('min_redemption_points', '100', 'Minimum points required for redemption'),
('max_redemption_percent', '50', 'Maximum percentage of bill that can be paid with points')
ON CONFLICT (setting_key) DO NOTHING;

-- Insert default achievements
INSERT INTO loyalty_achievements (name, display_name, description, icon, badge_type, criteria, points_award) VALUES
('first_payment', 'First Payment', 'Made your first successful payment', 'credit-card', 'payment', '{"payments_count": 1}', 100),
('loyal_customer_6months', '6 Months Loyal', 'Been a customer for 6 months', 'calendar', 'milestone', '{"months_tenure": 6}', 300),
('loyal_customer_12months', '1 Year Loyal', 'Been a customer for 12 months', 'calendar', 'milestone', '{"months_tenure": 12}', 500),
('referral_champion_5', 'Referral Champion', 'Referred 5 new customers', 'users', 'referral', '{"referral_count": 5}', 1000),
('points_collector_1000', 'Points Collector', 'Accumulated 1000 points', 'star', 'milestone', '{"total_points": 1000}', 200),
('super_saver', 'Super Saver', 'Redeemed 10 rewards', 'gift', 'milestone', '{"redemptions_count": 10}', 500)
ON CONFLICT (name) DO NOTHING;

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_customer_loyalty_status_user_id ON customer_loyalty_status(user_id);
CREATE INDEX IF NOT EXISTS idx_customer_loyalty_status_current_tier ON customer_loyalty_status(current_tier_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_points_transactions_user_id ON loyalty_points_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_points_transactions_type ON loyalty_points_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_loyalty_points_transactions_source ON loyalty_points_transactions(source_type, source_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_points_transactions_created_at ON loyalty_points_transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_rewards_catalog_category ON rewards_catalog(category);
CREATE INDEX IF NOT EXISTS idx_rewards_catalog_active ON rewards_catalog(is_active);
CREATE INDEX IF NOT EXISTS idx_reward_redemptions_user_id ON reward_redemptions(user_id);
CREATE INDEX IF NOT EXISTS idx_reward_redemptions_reward_id ON reward_redemptions(reward_id);
CREATE INDEX IF NOT EXISTS idx_reward_redemptions_status ON reward_redemptions(redemption_status);
CREATE INDEX IF NOT EXISTS idx_referral_tracking_referrer_id ON referral_tracking(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referral_tracking_referred_user_id ON referral_tracking(referred_user_id);
CREATE INDEX IF NOT EXISTS idx_referral_tracking_status ON referral_tracking(referral_status);
CREATE INDEX IF NOT EXISTS idx_referral_tracking_code ON referral_tracking(referral_code);
CREATE INDEX IF NOT EXISTS idx_customer_achievements_user_id ON customer_achievements(user_id);
CREATE INDEX IF NOT EXISTS idx_customer_achievements_achievement_id ON customer_achievements(achievement_id);

-- Row Level Security (RLS) Policies
ALTER TABLE loyalty_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_loyalty_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE loyalty_points_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE rewards_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE reward_redemptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE loyalty_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE loyalty_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_achievements ENABLE ROW LEVEL SECURITY;

-- RLS Policies for loyalty_tiers (public read access)
CREATE POLICY "Anyone can view loyalty tiers" ON loyalty_tiers FOR SELECT USING (is_active = true);

-- RLS Policies for customer_loyalty_status
CREATE POLICY "Users can view their own loyalty status" ON customer_loyalty_status FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own loyalty status" ON customer_loyalty_status FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own loyalty status" ON customer_loyalty_status FOR UPDATE USING (auth.uid() = user_id);

-- RLS Policies for loyalty_points_transactions
CREATE POLICY "Users can view their own points transactions" ON loyalty_points_transactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own points transactions" ON loyalty_points_transactions FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS Policies for rewards_catalog (public read access for active rewards)
CREATE POLICY "Anyone can view active rewards" ON rewards_catalog FOR SELECT USING (is_active = true);

-- RLS Policies for reward_redemptions
CREATE POLICY "Users can view their own reward redemptions" ON reward_redemptions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own reward redemptions" ON reward_redemptions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own reward redemptions" ON reward_redemptions FOR UPDATE USING (auth.uid() = user_id);

-- RLS Policies for referral_tracking
CREATE POLICY "Users can view their own referrals" ON referral_tracking FOR SELECT USING (auth.uid() = referrer_id);
CREATE POLICY "Users can insert their own referrals" ON referral_tracking FOR INSERT WITH CHECK (auth.uid() = referrer_id);
CREATE POLICY "Users can update their own referrals" ON referral_tracking FOR UPDATE USING (auth.uid() = referrer_id);

-- RLS Policies for loyalty_settings (public read access for active settings)
CREATE POLICY "Anyone can view active loyalty settings" ON loyalty_settings FOR SELECT USING (is_active = true);

-- RLS Policies for loyalty_achievements (public read access for active achievements)
CREATE POLICY "Anyone can view active achievements" ON loyalty_achievements FOR SELECT USING (is_active = true);

-- RLS Policies for customer_achievements
CREATE POLICY "Users can view their own achievements" ON customer_achievements FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own achievements" ON customer_achievements FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Functions for automatic timestamp updates
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for automatic timestamp updates
CREATE TRIGGER update_customer_loyalty_status_updated_at 
    BEFORE UPDATE ON customer_loyalty_status 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_rewards_catalog_updated_at 
    BEFORE UPDATE ON rewards_catalog 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reward_redemptions_updated_at 
    BEFORE UPDATE ON reward_redemptions 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_referral_tracking_updated_at 
    BEFORE UPDATE ON referral_tracking 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_loyalty_settings_updated_at 
    BEFORE UPDATE ON loyalty_settings 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_loyalty_achievements_updated_at 
    BEFORE UPDATE ON loyalty_achievements 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to calculate customer loyalty tier
CREATE OR REPLACE FUNCTION calculate_customer_tier(p_user_id UUID)
RETURNS UUID AS $$
DECLARE
    v_current_status RECORD;
    v_qualified_tier UUID;
    v_bronze_tier UUID;
BEGIN
    -- Get current loyalty status
    SELECT * INTO v_current_status FROM customer_loyalty_status WHERE user_id = p_user_id;
    
    IF NOT FOUND THEN
        -- Create new loyalty status with bronze tier
        SELECT id INTO v_bronze_tier FROM loyalty_tiers WHERE name = 'bronze' AND is_active = true;
        
        INSERT INTO customer_loyalty_status (
            user_id, 
            current_tier_id, 
            total_months_tenure, 
            last_activity_at,
            tier_updated_at
        ) VALUES (
            p_user_id,
            v_bronze_tier,
            0,
            NOW(),
            NOW()
        );
        
        RETURN v_bronze_tier;
    END IF;
    
    -- Find highest qualified tier
    SELECT id INTO v_qualified_tier
    FROM loyalty_tiers 
    WHERE is_active = true
    AND (
        (min_points IS NULL OR v_current_status.total_points_earned >= min_points) AND
        (min_months_tenure IS NULL OR v_current_status.total_months_tenure >= min_months_tenure) AND
        (min_total_spent IS NULL OR v_current_status.total_spent >= min_total_spent)
    )
    ORDER BY sort_order DESC
    LIMIT 1;
    
    -- Update tier if changed
    IF v_qualified_tier IS DISTINCT FROM v_current_status.current_tier_id THEN
        UPDATE customer_loyalty_status 
        SET current_tier_id = v_qualified_tier,
            tier_updated_at = NOW(),
            last_activity_at = NOW()
        WHERE user_id = p_user_id;
    END IF;
    
    RETURN COALESCE(v_qualified_tier, v_current_status.current_tier_id);
END;
$$ LANGUAGE plpgsql;

-- Function to add loyalty points
CREATE OR REPLACE FUNCTION add_loyalty_points(
    p_user_id UUID,
    p_points INTEGER,
    p_source_type VARCHAR(50),
    p_source_id UUID DEFAULT NULL,
    p_description TEXT,
    p_metadata JSONB DEFAULT '{}',
    p_expires_at TIMESTAMP WITH TIME ZONE DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    v_current_balance INTEGER;
    v_new_balance INTEGER;
    v_expiration_date TIMESTAMP WITH TIME ZONE;
BEGIN
    -- Get current points balance
    SELECT COALESCE(current_points_balance, 0) INTO v_current_balance
    FROM customer_loyalty_status 
    WHERE user_id = p_user_id;
    
    IF NOT FOUND THEN
        -- Create loyalty status if doesn't exist
        INSERT INTO customer_loyalty_status (user_id, current_points_balance, total_points_earned, last_activity_at)
        VALUES (p_user_id, p_points, p_points, NOW())
        RETURNING current_points_balance INTO v_current_balance;
    END IF;
    
    -- Calculate expiration if not provided
    v_expiration_date := COALESCE(
        p_expires_at,
        NOW() + (SELECT (setting_value::text)::integer * INTERVAL '1 month' 
                FROM loyalty_settings 
                WHERE setting_key = 'points_expiry_months' AND is_active = true)
    );
    
    -- Add points transaction
    v_new_balance := v_current_balance + p_points;
    
    INSERT INTO loyalty_points_transactions (
        user_id, 
        transaction_type, 
        points_amount, 
        balance_after, 
        source_type, 
        source_id, 
        description, 
        metadata,
        expires_at
    ) VALUES (
        p_user_id, 
        'earned', 
        p_points, 
        v_new_balance, 
        p_source_type, 
        p_source_id, 
        p_description, 
        p_metadata,
        v_expiration_date
    );
    
    -- Update customer loyalty status
    UPDATE customer_loyalty_status 
    SET current_points_balance = v_new_balance,
        total_points_earned = total_points_earned + p_points,
        last_activity_at = NOW()
    WHERE user_id = p_user_id;
    
    -- Recalculate tier
    PERFORM calculate_customer_tier(p_user_id);
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;