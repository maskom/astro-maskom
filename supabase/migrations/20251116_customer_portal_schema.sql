-- Customer Portal Enhancement Schema
-- This migration adds tables for comprehensive customer account management,
-- service management, and support ticket system

-- Customer Profiles Table (extends auth.users)
CREATE TABLE IF NOT EXISTS customer_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    date_of_birth DATE,
    gender VARCHAR(10) CHECK (gender IN ('male', 'female', 'other')),
    profile_image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Service Addresses Table
CREATE TABLE IF NOT EXISTS service_addresses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    address_line1 TEXT NOT NULL,
    address_line2 TEXT,
    city VARCHAR(100) NOT NULL,
    province VARCHAR(100) NOT NULL,
    postal_code VARCHAR(10) NOT NULL,
    country VARCHAR(100) DEFAULT 'Indonesia',
    is_primary BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Customer Subscriptions Table
CREATE TABLE IF NOT EXISTS customer_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    package_id VARCHAR(100) NOT NULL,
    package_name VARCHAR(255) NOT NULL,
    package_speed VARCHAR(50) NOT NULL,
    package_price DECIMAL(12,2) NOT NULL,
    service_address_id UUID REFERENCES service_addresses(id) ON DELETE SET NULL,
    status VARCHAR(50) NOT NULL CHECK (status IN ('active', 'suspended', 'cancelled', 'pending')),
    start_date TIMESTAMP WITH TIME ZONE NOT NULL,
    end_date TIMESTAMP WITH TIME ZONE,
    auto_renew BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Usage Monitoring Table
CREATE TABLE IF NOT EXISTS usage_monitoring (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    subscription_id UUID REFERENCES customer_subscriptions(id) ON DELETE CASCADE,
    data_used BIGINT NOT NULL DEFAULT 0, -- in bytes
    data_limit BIGINT, -- in bytes, null for unlimited
    measurement_date DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, measurement_date)
);

-- Support Tickets Table
CREATE TABLE IF NOT EXISTS support_tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    ticket_number VARCHAR(50) UNIQUE NOT NULL,
    subject TEXT NOT NULL,
    description TEXT NOT NULL,
    category VARCHAR(50) NOT NULL CHECK (category IN ('technical', 'billing', 'service', 'general')),
    priority VARCHAR(20) NOT NULL CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    status VARCHAR(50) NOT NULL CHECK (status IN ('open', 'in_progress', 'pending_customer', 'resolved', 'closed')),
    assigned_to UUID, -- staff user ID
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ticket Messages Table
CREATE TABLE IF NOT EXISTS ticket_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID REFERENCES support_tickets(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    is_internal BOOLEAN DEFAULT false, -- true for internal notes, false for customer messages
    attachments JSONB DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Notification Preferences Table
CREATE TABLE IF NOT EXISTS notification_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    email_notifications BOOLEAN DEFAULT true,
    sms_notifications BOOLEAN DEFAULT false,
    push_notifications BOOLEAN DEFAULT true,
    billing_reminders BOOLEAN DEFAULT true,
    usage_alerts BOOLEAN DEFAULT true,
    maintenance_notifications BOOLEAN DEFAULT true,
    marketing_emails BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Service Requests Table (for installation, moving, etc.)
CREATE TABLE IF NOT EXISTS service_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    request_type VARCHAR(50) NOT NULL CHECK (request_type IN ('installation', 'moving', 'upgrade', 'downgrade', 'cancellation', 'repair')),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    preferred_date DATE,
    preferred_time_window VARCHAR(50), -- morning, afternoon, evening
    service_address_id UUID REFERENCES service_addresses(id) ON DELETE SET NULL,
    status VARCHAR(50) NOT NULL CHECK (status IN ('pending', 'scheduled', 'in_progress', 'completed', 'cancelled')),
    technician_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_customer_profiles_user_id ON customer_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_service_addresses_user_id ON service_addresses(user_id);
CREATE INDEX IF NOT EXISTS idx_service_addresses_is_primary ON service_addresses(is_primary);

CREATE INDEX IF NOT EXISTS idx_customer_subscriptions_user_id ON customer_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_customer_subscriptions_status ON customer_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_customer_subscriptions_package_id ON customer_subscriptions(package_id);

CREATE INDEX IF NOT EXISTS idx_usage_monitoring_user_id ON usage_monitoring(user_id);
CREATE INDEX IF NOT EXISTS idx_usage_monitoring_subscription_id ON usage_monitoring(subscription_id);
CREATE INDEX IF NOT EXISTS idx_usage_monitoring_measurement_date ON usage_monitoring(measurement_date);

CREATE INDEX IF NOT EXISTS idx_support_tickets_user_id ON support_tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_support_tickets_category ON support_tickets(category);
CREATE INDEX IF NOT EXISTS idx_support_tickets_priority ON support_tickets(priority);
CREATE INDEX IF NOT EXISTS idx_support_tickets_ticket_number ON support_tickets(ticket_number);

CREATE INDEX IF NOT EXISTS idx_ticket_messages_ticket_id ON ticket_messages(ticket_id);
CREATE INDEX IF NOT EXISTS idx_ticket_messages_sender_id ON ticket_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_ticket_messages_created_at ON ticket_messages(created_at);

CREATE INDEX IF NOT EXISTS idx_notification_preferences_user_id ON notification_preferences(user_id);

CREATE INDEX IF NOT EXISTS idx_service_requests_user_id ON service_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_service_requests_status ON service_requests(status);
CREATE INDEX IF NOT EXISTS idx_service_requests_request_type ON service_requests(request_type);

-- Row Level Security (RLS) Policies
ALTER TABLE customer_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_monitoring ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies for customer_profiles
CREATE POLICY "Users can view their own profile"
    ON customer_profiles FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile"
    ON customer_profiles FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
    ON customer_profiles FOR UPDATE
    USING (auth.uid() = user_id);

-- RLS Policies for service_addresses
CREATE POLICY "Users can view their own service addresses"
    ON service_addresses FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own service addresses"
    ON service_addresses FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own service addresses"
    ON service_addresses FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own service addresses"
    ON service_addresses FOR DELETE
    USING (auth.uid() = user_id);

-- RLS Policies for customer_subscriptions
CREATE POLICY "Users can view their own subscriptions"
    ON customer_subscriptions FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own subscriptions"
    ON customer_subscriptions FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- RLS Policies for usage_monitoring
CREATE POLICY "Users can view their own usage"
    ON usage_monitoring FOR SELECT
    USING (auth.uid() = user_id);

-- RLS Policies for support_tickets
CREATE POLICY "Users can view their own support tickets"
    ON support_tickets FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own support tickets"
    ON support_tickets FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own support tickets"
    ON support_tickets FOR UPDATE
    USING (auth.uid() = user_id);

-- RLS Policies for ticket_messages
CREATE POLICY "Users can view messages for their own tickets"
    ON ticket_messages FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM support_tickets 
            WHERE support_tickets.id = ticket_messages.ticket_id 
            AND support_tickets.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert messages for their own tickets"
    ON ticket_messages FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM support_tickets 
            WHERE support_tickets.id = ticket_messages.ticket_id 
            AND support_tickets.user_id = auth.uid()
        )
    );

-- RLS Policies for notification_preferences
CREATE POLICY "Users can view their own notification preferences"
    ON notification_preferences FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own notification preferences"
    ON notification_preferences FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own notification preferences"
    ON notification_preferences FOR UPDATE
    USING (auth.uid() = user_id);

-- RLS Policies for service_requests
CREATE POLICY "Users can view their own service requests"
    ON service_requests FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own service requests"
    ON service_requests FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own service requests"
    ON service_requests FOR UPDATE
    USING (auth.uid() = user_id);

-- Triggers for automatic timestamp updates
CREATE TRIGGER update_customer_profiles_updated_at 
    BEFORE UPDATE ON customer_profiles 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_service_addresses_updated_at 
    BEFORE UPDATE ON service_addresses 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_customer_subscriptions_updated_at 
    BEFORE UPDATE ON customer_subscriptions 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_support_tickets_updated_at 
    BEFORE UPDATE ON support_tickets 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notification_preferences_updated_at 
    BEFORE UPDATE ON notification_preferences 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_service_requests_updated_at 
    BEFORE UPDATE ON service_requests 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to generate ticket numbers
CREATE OR REPLACE FUNCTION generate_ticket_number()
RETURNS TEXT AS $$
DECLARE
    ticket_num TEXT;
    date_part TEXT;
    sequence_part INTEGER;
BEGIN
    date_part := TO_CHAR(NOW(), 'YYYYMMDD');
    
    -- Get the sequence number for today
    SELECT COALESCE(MAX(CAST(SUBSTRING(ticket_number FROM 9) AS INTEGER)), 0) + 1
    INTO sequence_part
    FROM support_tickets
    WHERE ticket_number LIKE 'TKT-' || date_part || '-%';
    
    ticket_num := 'TKT-' || date_part || '-' || LPAD(sequence_part::TEXT, 4, '0');
    
    RETURN ticket_num;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-generate ticket numbers
CREATE OR REPLACE FUNCTION set_ticket_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.ticket_number IS NULL OR NEW.ticket_number = '' THEN
        NEW.ticket_number := generate_ticket_number();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_support_ticket_number
    BEFORE INSERT ON support_tickets
    FOR EACH ROW EXECUTE FUNCTION set_ticket_number();

-- Function to ensure only one primary address per user
CREATE OR REPLACE FUNCTION ensure_single_primary_address()
RETURNS TRIGGER AS $$
BEGIN
    -- If new address is set as primary, unset all other primary addresses for this user
    IF NEW.is_primary = true THEN
        UPDATE service_addresses 
        SET is_primary = false 
        WHERE user_id = NEW.user_id AND id != NEW.id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ensure_single_primary_address_trigger
    BEFORE INSERT OR UPDATE ON service_addresses
    FOR EACH ROW EXECUTE FUNCTION ensure_single_primary_address();