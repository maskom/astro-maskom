-- Billing Preferences Table
CREATE TABLE IF NOT EXISTS billing_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    email_notifications BOOLEAN DEFAULT true,
    sms_notifications BOOLEAN DEFAULT false,
    payment_reminders BOOLEAN DEFAULT true,
    overdue_reminders BOOLEAN DEFAULT true,
    payment_confirmations BOOLEAN DEFAULT true,
    monthly_statements BOOLEAN DEFAULT true,
    auto_payment BOOLEAN DEFAULT false,
    default_payment_method UUID REFERENCES payment_methods(id) ON DELETE SET NULL,
    billing_address JSONB DEFAULT '{}',
    tax_information JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_billing_preferences_user_id ON billing_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_billing_preferences_default_payment_method ON billing_preferences(default_payment_method);

-- Row Level Security (RLS) Policy
ALTER TABLE billing_preferences ENABLE ROW LEVEL SECURITY;

-- RLS Policy for billing_preferences
CREATE POLICY "Users can view their own billing preferences"
    ON billing_preferences FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own billing preferences"
    ON billing_preferences FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own billing preferences"
    ON billing_preferences FOR UPDATE
    USING (auth.uid() = user_id);

-- Trigger for automatic timestamp updates
CREATE TRIGGER update_billing_preferences_updated_at 
    BEFORE UPDATE ON billing_preferences 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();