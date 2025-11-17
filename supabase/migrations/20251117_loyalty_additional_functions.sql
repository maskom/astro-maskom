-- Additional database functions for loyalty system

-- Function to update customer spending
CREATE OR REPLACE FUNCTION update_customer_spending(p_user_id UUID, p_amount DECIMAL)
RETURNS VOID AS $$
BEGIN
    INSERT INTO customer_loyalty_status (
        user_id, 
        total_spent, 
        last_activity_at
    ) VALUES (
        p_user_id,
        p_amount,
        NOW()
    )
    ON CONFLICT (user_id) 
    DO UPDATE SET 
        total_spent = customer_loyalty_status.total_spent + p_amount,
        last_activity_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- Function to update referral count
CREATE OR REPLACE FUNCTION update_referral_count(p_user_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE customer_loyalty_status 
    SET 
        referral_count = (
            SELECT COUNT(*) 
            FROM referral_tracking 
            WHERE referrer_id = p_user_id 
            AND referral_status = 'completed'
        ),
        last_activity_at = NOW()
    WHERE user_id = p_user_id;
END;
$$ LANGUAGE plpgsql;

-- Function to get customer loyalty summary
CREATE OR REPLACE FUNCTION get_customer_loyalty_summary(p_user_id UUID)
RETURNS TABLE (
    current_tier_name VARCHAR,
    current_points_balance INTEGER,
    total_points_earned INTEGER,
    total_points_redeemed INTEGER,
    total_months_tenure INTEGER,
    total_spent DECIMAL,
    referral_count INTEGER,
    next_tier_name VARCHAR,
    points_to_next_tier INTEGER,
    tier_progress_percentage DECIMAL
) AS $$
DECLARE
    v_current_status RECORD;
    v_next_tier RECORD;
    v_points_to_next_tier INTEGER;
    v_tier_progress DECIMAL;
BEGIN
    -- Get current loyalty status
    SELECT 
        cls.*,
        lt.name as tier_name,
        lt.sort_order as current_sort_order
    INTO v_current_status
    FROM customer_loyalty_status cls
    LEFT JOIN loyalty_tiers lt ON cls.current_tier_id = lt.id
    WHERE cls.user_id = p_user_id;

    IF NOT FOUND THEN
        RETURN;
    END IF;

    -- Get next tier
    SELECT *
    INTO v_next_tier
    FROM loyalty_tiers
    WHERE is_active = true
    AND sort_order > v_current_status.current_sort_order
    ORDER BY sort_order ASC
    LIMIT 1;

    -- Calculate points to next tier
    IF v_next_tier.id IS NOT NULL THEN
        v_points_to_next_tier := GREATEST(0, v_next_tier.min_points - v_current_status.total_points_earned);
        
        -- Calculate progress percentage
        DECLARE
            v_current_range INTEGER;
            v_next_range INTEGER;
        BEGIN
            v_current_range := v_current_status.total_points_earned - v_current_status.min_points;
            v_next_range := v_next_tier.min_points - v_current_status.min_points;
            v_tier_progress := CASE 
                WHEN v_next_range > 0 THEN (v_current_range::DECIMAL / v_next_range::DECIMAL) * 100
                ELSE 100 
            END;
        END;
    ELSE
        v_points_to_next_tier := 0;
        v_tier_progress := 100;
    END IF;

    -- Return results
    RETURN QUERY SELECT
        v_current_status.tier_name,
        v_current_status.current_points_balance,
        v_current_status.total_points_earned,
        v_current_status.total_points_redeemed,
        v_current_status.total_months_tenure,
        v_current_status.total_spent,
        v_current_status.referral_count,
        COALESCE(v_next_tier.display_name, 'MAX'),
        v_points_to_next_tier,
        v_tier_progress;
END;
$$ LANGUAGE plpgsql;

-- Function to process monthly tenure points
CREATE OR REPLACE FUNCTION process_monthly_tenure_points()
RETURNS TABLE (
    user_id UUID,
    points_awarded INTEGER,
    processing_status VARCHAR
) AS $$
DECLARE
    v_settings RECORD;
    v_users RECORD;
    v_points INTEGER;
    v_description TEXT;
BEGIN
    -- Get loyalty settings
    SELECT setting_value INTO v_settings
    FROM loyalty_settings
    WHERE setting_key = 'points_per_month_tenure' AND is_active = true;

    IF NOT FOUND THEN
        RETURN;
    END IF;

    -- Process each user who hasn't received tenure points this month
    FOR v_users IN 
        SELECT DISTINCT 
            cls.user_id,
            cls.total_months_tenure,
            EXTRACT(MONTH FROM cls.last_activity_at) as last_activity_month,
            EXTRACT(YEAR FROM cls.last_activity_at) as last_activity_year
        FROM customer_loyalty_status cls
        WHERE cls.total_months_tenure >= 0
        AND (
            cls.last_activity_at IS NULL
            OR EXTRACT(MONTH FROM cls.last_activity_at) != EXTRACT(MONTH FROM NOW())
            OR EXTRACT(YEAR FROM cls.last_activity_at) != EXTRACT(YEAR FROM NOW())
        )
    LOOP
        -- Calculate base points
        v_points := v_settings.setting_value::INTEGER;

        -- Check for anniversary bonus (every 12 months)
        IF v_users.total_months_tenure > 0 AND v_users.total_months_tenure % 12 = 0 THEN
            DECLARE
                v_anniversary_bonus INTEGER;
            BEGIN
                SELECT setting_value INTO v_anniversary_bonus
                FROM loyalty_settings
                WHERE setting_key = 'anniversary_bonus_points' AND is_active = true;
                
                IF FOUND THEN
                    v_points := v_points + v_anniversary_bonus;
                END IF;
            END;
        END IF;

        -- Build description
        v_description := 'Monthly tenure points';
        IF v_users.total_months_tenure > 0 AND v_users.total_months_tenure % 12 = 0 THEN
            v_description := v_description || ' with anniversary bonus';
        END IF;

        -- Award points
        BEGIN
            PERFORM add_loyalty_points(
                v_users.user_id,
                v_points,
                'bonus',
                v_description,
                NULL,
                jsonb_build_object('months_tenure', v_users.total_months_tenure)
            );

            -- Update tenure months
            UPDATE customer_loyalty_status
            SET 
                total_months_tenure = total_months_tenure + 1,
                last_activity_at = NOW()
            WHERE user_id = v_users.user_id;

            RETURN NEXT SELECT
                v_users.user_id,
                v_points,
                'success'::VARCHAR;
        EXCEPTION WHEN OTHERS THEN
            RETURN NEXT SELECT
                v_users.user_id,
                0,
                'error: ' || SQLERRM::VARCHAR;
        END;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Function to get popular rewards
CREATE OR REPLACE FUNCTION get_popular_rewards(p_limit INTEGER DEFAULT 10)
RETURNS TABLE (
    reward_id UUID,
    reward_name VARCHAR,
    reward_category VARCHAR,
    points_cost INTEGER,
    total_redemptions BIGINT,
    average_rating DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        rc.id as reward_id,
        rc.name as reward_name,
        rc.category as reward_category,
        rc.points_cost,
        COALESCE(rr.redemption_count, 0) as total_redemptions,
        COALESCE(rr.average_rating, 0) as average_rating
    FROM rewards_catalog rc
    LEFT JOIN (
        SELECT 
            reward_id,
            COUNT(*) as redemption_count,
            AVG(CASE WHEN fulfillment_data->>'rating' IS NOT NULL 
                THEN (fulfillment_data->>'rating')::DECIMAL 
                ELSE NULL END) as average_rating
        FROM reward_redemptions
        WHERE redemption_status IN ('approved', 'fulfilled')
        GROUP BY reward_id
    ) rr ON rc.id = rr.reward_id
    WHERE rc.is_active = true
    ORDER BY total_redemptions DESC, average_rating DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Function to get loyalty analytics
CREATE OR REPLACE FUNCTION get_loyalty_analytics(p_date_range VARCHAR DEFAULT '30')
RETURNS TABLE (
    metric_name VARCHAR,
    metric_value BIGINT,
    metric_change DECIMAL,
    comparison_period VARCHAR
) AS $$
BEGIN
    -- Active loyalty members
    RETURN QUERY SELECT
        'active_members'::VARCHAR,
        COUNT(*)::BIGINT,
        0::DECIMAL,
        'current'::VARCHAR
    FROM customer_loyalty_status
    WHERE last_activity_at >= NOW() - INTERVAL '1 month';

    -- Total points in circulation
    RETURN QUERY SELECT
        'total_points_circulation'::VARCHAR,
        SUM(current_points_balance)::BIGINT,
        0::DECIMAL,
        'current'::VARCHAR
    FROM customer_loyalty_status;

    -- Points earned this month
    RETURN QUERY SELECT
        'points_earned_monthly'::VARCHAR,
        COALESCE(SUM(points_amount), 0)::BIGINT,
        0::DECIMAL,
        'current'::VARCHAR
    FROM loyalty_points_transactions
    WHERE transaction_type = 'earned'
    AND created_at >= NOW() - INTERVAL '1 month';

    -- Points redeemed this month
    RETURN QUERY SELECT
        'points_redeemed_monthly'::VARCHAR,
        COALESCE(ABS(SUM(points_amount)), 0)::BIGINT,
        0::DECIMAL,
        'current'::VARCHAR
    FROM loyalty_points_transactions
    WHERE transaction_type = 'redeemed'
    AND created_at >= NOW() - INTERVAL '1 month';

    -- Rewards redeemed this month
    RETURN QUERY SELECT
        'rewards_redeemed_monthly'::VARCHAR,
        COUNT(*)::BIGINT,
        0::DECIMAL,
        'current'::VARCHAR
    FROM reward_redemptions
    WHERE redemption_status IN ('approved', 'fulfilled')
    AND created_at >= NOW() - INTERVAL '1 month';

    -- Successful referrals this month
    RETURN QUERY SELECT
        'successful_referrals_monthly'::VARCHAR,
        COUNT(*)::BIGINT,
        0::DECIMAL,
        'current'::VARCHAR
    FROM referral_tracking
    WHERE referral_status = 'completed'
    AND completed_at >= NOW() - INTERVAL '1 month';
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically award points on successful payment
CREATE OR REPLACE FUNCTION award_payment_points()
RETURNS TRIGGER AS $$
DECLARE
    v_points INTEGER;
    v_calculation JSONB;
BEGIN
    -- Only award points for successful payments
    IF NEW.status = 'success' AND OLD.status != 'success' THEN
        -- Calculate points using the service
        SELECT calculation INTO v_calculation
        FROM loyalty_calculate_payment_points(NEW.user_id, NEW.amount, NEW.id);

        -- The actual point awarding is handled by the service
        -- This trigger is mainly for logging and potential future enhancements
        NULL;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for payment points (if payment_transactions table exists)
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'payment_transactions') THEN
        CREATE TRIGGER trigger_award_payment_points
            AFTER UPDATE ON payment_transactions
            FOR EACH ROW
            EXECUTE FUNCTION award_payment_points();
    END IF;
END $$;