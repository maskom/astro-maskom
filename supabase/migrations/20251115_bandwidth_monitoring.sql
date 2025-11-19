-- Bandwidth Usage Tracking Table
CREATE TABLE IF NOT EXISTS bandwidth_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    package_id VARCHAR(100) NOT NULL,
    usage_date DATE NOT NULL,
    download_bytes BIGINT NOT NULL DEFAULT 0,
    upload_bytes BIGINT NOT NULL DEFAULT 0,
    total_bytes BIGINT GENERATED ALWAYS AS (download_bytes + upload_bytes) STORED,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, usage_date)
);

-- Data Caps Configuration Table
CREATE TABLE IF NOT EXISTS data_caps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    package_id VARCHAR(100) NOT NULL,
    monthly_cap_gb INTEGER NOT NULL,
    current_usage_gb DECIMAL(10,2) NOT NULL DEFAULT 0,
    billing_cycle_start DATE NOT NULL,
    is_active BOOLEAN DEFAULT true,
    notification_thresholds JSONB DEFAULT '[80, 90, 100]',
    last_notified_at JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, package_id)
);

-- Usage Notifications Table
CREATE TABLE IF NOT EXISTS usage_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    data_cap_id UUID REFERENCES data_caps(id) ON DELETE CASCADE,
    threshold_percentage INTEGER NOT NULL,
    notification_type VARCHAR(50) NOT NULL CHECK (notification_type IN ('email', 'sms', 'dashboard')),
    message TEXT NOT NULL,
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_read BOOLEAN DEFAULT false
);

-- Bandwidth Usage History (for long-term storage)
CREATE TABLE IF NOT EXISTS bandwidth_usage_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    month DATE NOT NULL,
    total_usage_gb DECIMAL(12,2) NOT NULL,
    package_id VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_bandwidth_usage_user_id ON bandwidth_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_bandwidth_usage_date ON bandwidth_usage(usage_date);
CREATE INDEX IF NOT EXISTS idx_bandwidth_usage_user_date ON bandwidth_usage(user_id, usage_date);

CREATE INDEX IF NOT EXISTS idx_data_caps_user_id ON data_caps(user_id);
CREATE INDEX IF NOT EXISTS idx_data_caps_package_id ON data_caps(package_id);
CREATE INDEX IF NOT EXISTS idx_data_caps_active ON data_caps(is_active);

CREATE INDEX IF NOT EXISTS idx_usage_notifications_user_id ON usage_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_usage_notifications_data_cap_id ON usage_notifications(data_cap_id);
CREATE INDEX IF NOT EXISTS idx_usage_notifications_sent_at ON usage_notifications(sent_at);

CREATE INDEX IF NOT EXISTS idx_bandwidth_usage_history_user_id ON bandwidth_usage_history(user_id);
CREATE INDEX IF NOT EXISTS idx_bandwidth_usage_history_month ON bandwidth_usage_history(month);

-- Row Level Security (RLS) Policies
ALTER TABLE bandwidth_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_caps ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE bandwidth_usage_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies for bandwidth_usage
CREATE POLICY "Users can view their own bandwidth usage"
    ON bandwidth_usage FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own bandwidth usage"
    ON bandwidth_usage FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own bandwidth usage"
    ON bandwidth_usage FOR UPDATE
    USING (auth.uid() = user_id);

-- RLS Policies for data_caps
CREATE POLICY "Users can view their own data caps"
    ON data_caps FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own data caps"
    ON data_caps FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own data caps"
    ON data_caps FOR UPDATE
    USING (auth.uid() = user_id);

-- RLS Policies for usage_notifications
CREATE POLICY "Users can view their own usage notifications"
    ON usage_notifications FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own usage notifications"
    ON usage_notifications FOR UPDATE
    USING (auth.uid() = user_id);

-- RLS Policies for bandwidth_usage_history
CREATE POLICY "Users can view their own usage history"
    ON bandwidth_usage_history FOR SELECT
    USING (auth.uid() = user_id);

-- Admin policies (assuming admin role exists)
CREATE POLICY "Admins can view all bandwidth usage"
    ON bandwidth_usage FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE auth.users.id = auth.uid() 
            AND auth.users.raw_user_meta_data->>'role' = 'admin'
        )
    );

CREATE POLICY "Admins can view all data caps"
    ON data_caps FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE auth.users.id = auth.uid() 
            AND auth.users.raw_user_meta_data->>'role' = 'admin'
        )
    );

-- Functions for automatic timestamp updates
CREATE TRIGGER update_bandwidth_usage_updated_at 
    BEFORE UPDATE ON bandwidth_usage 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_data_caps_updated_at 
    BEFORE UPDATE ON data_caps 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to calculate monthly usage
CREATE OR REPLACE FUNCTION calculate_monthly_usage(
    p_user_id UUID,
    p_start_date DATE
)
RETURNS DECIMAL(12,2) AS $$
DECLARE
    total_usage DECIMAL(12,2);
BEGIN
    SELECT COALESCE(SUM(total_bytes) / (1024.0 * 1024.0 * 1024.0), 0)
    INTO total_usage
    FROM bandwidth_usage
    WHERE user_id = p_user_id
    AND usage_date >= p_start_date
    AND usage_date < p_start_date + INTERVAL '1 month';
    
    RETURN total_usage;
END;
$$ LANGUAGE plpgsql;

-- Function to update data cap usage
CREATE OR REPLACE FUNCTION update_data_cap_usage()
RETURNS TRIGGER AS $$
DECLARE
    billing_start DATE;
    current_usage DECIMAL(12,2);
BEGIN
    -- Get billing cycle start for this user
    SELECT billing_cycle_start
    INTO billing_start
    FROM data_caps
    WHERE user_id = NEW.user_id AND package_id = NEW.package_id;
    
    -- Calculate current month usage
    current_usage := calculate_monthly_usage(NEW.user_id, billing_start);
    
    -- Update data caps table
    UPDATE data_caps
    SET current_usage_gb = current_usage,
        updated_at = NOW()
    WHERE user_id = NEW.user_id AND package_id = NEW.package_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update data cap usage when bandwidth usage is updated
CREATE TRIGGER update_data_cap_usage_trigger
    AFTER INSERT OR UPDATE ON bandwidth_usage
    FOR EACH ROW EXECUTE FUNCTION update_data_cap_usage();

-- Function to check usage thresholds and create notifications
CREATE OR REPLACE FUNCTION check_usage_thresholds()
RETURNS TRIGGER AS $$
DECLARE
    cap_record data_caps%ROWTYPE;
    usage_percentage DECIMAL(5,2);
    thresholds JSONB;
    threshold_val INTEGER;
    last_notified JSONB;
BEGIN
    -- Get the data cap record
    SELECT * INTO cap_record
    FROM data_caps
    WHERE user_id = NEW.user_id AND package_id = NEW.package_id AND is_active = true;
    
    IF NOT FOUND THEN
        RETURN NEW;
    END IF;
    
    -- Calculate usage percentage
    usage_percentage := (NEW.current_usage_gb / cap_record.monthly_cap_gb) * 100;
    
    -- Check each threshold
    thresholds := cap_record.notification_thresholds;
    last_notified := cap_record.last_notified_at;
    
    FOR threshold_val IN SELECT value::integer FROM jsonb_array_elements(thresholds)
    LOOP
        IF usage_percentage >= threshold_val THEN
            -- Check if we haven't notified for this threshold yet
            IF NOT (last_notified ? threshold_val::text) OR 
               (last_notified->>threshold_val::text)::timestamp < NOW() - INTERVAL '24 hours' THEN
                
                -- Create notification
                INSERT INTO usage_notifications (
                    user_id,
                    data_cap_id,
                    threshold_percentage,
                    notification_type,
                    message
                ) VALUES (
                    NEW.user_id,
                    cap_record.id,
                    threshold_val,
                    'dashboard',
                    format('You have used %s%% of your monthly data cap (%s GB used / %s GB total)', 
                           ROUND(usage_percentage, 1), 
                           NEW.current_usage_gb, 
                           cap_record.monthly_cap_gb)
                );
                
                -- Update last notified timestamp
                last_notified := jsonb_set(
                    last_notified, 
                    threshold_val::text, 
                    to_jsonb(NOW())
                );
            END IF;
        END IF;
    END LOOP;
    
    -- Update last_notified_at
    UPDATE data_caps
    SET last_notified_at = last_notified
    WHERE id = cap_record.id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to check usage thresholds
CREATE TRIGGER check_usage_thresholds_trigger
    AFTER UPDATE ON data_caps
    FOR EACH ROW EXECUTE FUNCTION check_usage_thresholds();

-- Function to archive monthly data
CREATE OR REPLACE FUNCTION archive_monthly_usage()
RETURNS void AS $$
BEGIN
    INSERT INTO bandwidth_usage_history (user_id, month, total_usage_gb, package_id)
    SELECT 
        user_id,
        DATE_TRUNC('month', usage_date) as month,
        SUM(total_bytes) / (1024.0 * 1024.0 * 1024.0) as total_usage_gb,
        package_id
    FROM bandwidth_usage
    WHERE usage_date < DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '6 months'
    GROUP BY user_id, DATE_TRUNC('month', usage_date), package_id
    ON CONFLICT DO NOTHING;
    
    DELETE FROM bandwidth_usage
    WHERE usage_date < DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '6 months';
END;
$$ LANGUAGE plpgsql;