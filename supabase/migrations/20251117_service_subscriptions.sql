-- Service Subscriptions Table
CREATE TABLE IF NOT EXISTS service_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    package_id UUID REFERENCES packages(id) ON DELETE CASCADE,
    monthly_amount DECIMAL(12,2) NOT NULL,
    billing_day INTEGER NOT NULL DEFAULT 1, -- Day of month for billing (1-31)
    is_active BOOLEAN DEFAULT true,
    next_billing_date TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_service_subscriptions_user_id ON service_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_service_subscriptions_package_id ON service_subscriptions(package_id);
CREATE INDEX IF NOT EXISTS idx_service_subscriptions_next_billing_date ON service_subscriptions(next_billing_date);
CREATE INDEX IF NOT EXISTS idx_service_subscriptions_is_active ON service_subscriptions(is_active);

-- Row Level Security (RLS) Policy
ALTER TABLE service_subscriptions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for service_subscriptions
CREATE POLICY "Users can view their own subscriptions"
    ON service_subscriptions FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own subscriptions"
    ON service_subscriptions FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own subscriptions"
    ON service_subscriptions FOR UPDATE
    USING (auth.uid() = user_id);

-- Trigger for automatic timestamp updates
CREATE TRIGGER update_service_subscriptions_updated_at 
    BEFORE UPDATE ON service_subscriptions 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to validate billing day
CREATE OR REPLACE FUNCTION validate_billing_day()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.billing_day < 1 OR NEW.billing_day > 31 THEN
        RAISE EXCEPTION 'Billing day must be between 1 and 31';
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to validate billing day
CREATE TRIGGER validate_billing_day_trigger
    BEFORE INSERT OR UPDATE ON service_subscriptions
    FOR EACH ROW EXECUTE FUNCTION validate_billing_day();