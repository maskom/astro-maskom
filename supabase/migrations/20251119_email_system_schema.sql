-- Email System Database Schema
-- Comprehensive email notification and communication system

-- Email queue for managing outgoing emails
CREATE TABLE IF NOT EXISTS email_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    to_email TEXT NOT NULL,
    from_email TEXT NOT NULL DEFAULT 'noreply@maskom.network',
    subject TEXT NOT NULL,
    content_html TEXT,
    content_text TEXT,
    template_id UUID REFERENCES email_templates(id),
    template_data JSONB DEFAULT '{}',
    priority INTEGER DEFAULT 5 CHECK (priority >= 1 AND priority <= 10),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'sent', 'failed', 'cancelled', 'retry')),
    attempts INTEGER DEFAULT 0 CHECK (attempts >= 0),
    max_attempts INTEGER DEFAULT 3 CHECK (max_attempts > 0),
    last_attempt_at TIMESTAMPTZ,
    next_retry_at TIMESTAMPTZ,
    sent_at TIMESTAMPTZ,
    error_message TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Email templates for dynamic content
CREATE TABLE IF NOT EXISTS email_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    subject_template TEXT NOT NULL,
    html_template TEXT NOT NULL,
    text_template TEXT,
    category TEXT NOT NULL DEFAULT 'transactional' CHECK (category IN ('transactional', 'marketing', 'notification', 'system')),
    is_active BOOLEAN DEFAULT true,
    version INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Email delivery logs for tracking and analytics
CREATE TABLE IF NOT EXISTS email_delivery_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email_id UUID NOT NULL REFERENCES email_queue(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL CHECK (event_type IN ('queued', 'sent', 'delivered', 'bounced', 'complained', 'rejected', 'failed')),
    provider TEXT,
    provider_message_id TEXT,
    response_code TEXT,
    response_message TEXT,
    processed_at TIMESTAMPTZ DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'
);

-- Email queue settings for configuration
CREATE TABLE IF NOT EXISTS email_queue_settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    description TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Customer email preferences for communication management
CREATE TABLE IF NOT EXISTS customer_email_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    email_enabled BOOLEAN DEFAULT true,
    transactional_emails BOOLEAN DEFAULT true,
    marketing_emails BOOLEAN DEFAULT false,
    newsletter_emails BOOLEAN DEFAULT false,
    billing_notifications BOOLEAN DEFAULT true,
    service_notifications BOOLEAN DEFAULT true,
    appointment_reminders BOOLEAN DEFAULT true,
    promotional_emails BOOLEAN DEFAULT false,
    security_notifications BOOLEAN DEFAULT true,
    frequency_preference TEXT DEFAULT 'normal' CHECK (frequency_preference IN ('immediate', 'daily', 'weekly', 'never')),
    preferred_language TEXT DEFAULT 'id' CHECK (preferred_language IN ('id', 'en')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(customer_id)
);

-- Email campaigns for marketing communications
CREATE TABLE IF NOT EXISTS email_campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    subject TEXT NOT NULL,
    content_html TEXT NOT NULL,
    content_text TEXT,
    campaign_type TEXT NOT NULL DEFAULT 'marketing' CHECK (campaign_type IN ('marketing', 'newsletter', 'promotional', 'announcement')),
    target_audience JSONB DEFAULT '{}',
    scheduled_at TIMESTAMPTZ,
    sent_at TIMESTAMPTZ,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'sending', 'sent', 'cancelled', 'paused')),
    total_recipients INTEGER DEFAULT 0,
    sent_count INTEGER DEFAULT 0,
    delivered_count INTEGER DEFAULT 0,
    opened_count INTEGER DEFAULT 0,
    clicked_count INTEGER DEFAULT 0,
    bounced_count INTEGER DEFAULT 0,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Campaign recipients for tracking who received which campaigns
CREATE TABLE IF NOT EXISTS email_campaign_recipients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID NOT NULL REFERENCES email_campaigns(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    email_id UUID REFERENCES email_queue(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'bounced', 'opened', 'clicked')),
    sent_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    opened_at TIMESTAMPTZ,
    clicked_at TIMESTAMPTZ,
    bounced_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(campaign_id, customer_id)
);

-- Email analytics for comprehensive tracking
CREATE TABLE IF NOT EXISTS email_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email_id UUID REFERENCES email_queue(id) ON DELETE CASCADE,
    campaign_id UUID REFERENCES email_campaigns(id) ON DELETE SET NULL,
    customer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    event_type TEXT NOT NULL,
    event_data JSONB DEFAULT '{}',
    user_agent TEXT,
    ip_address INET,
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Unsubscribe management for compliance
CREATE TABLE IF NOT EXISTS email_unsubscribes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL,
    customer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    reason TEXT,
    campaign_id UUID REFERENCES email_campaigns(id) ON DELETE SET NULL,
    unsubscribe_token TEXT UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_email_queue_status ON email_queue(status);
CREATE INDEX IF NOT EXISTS idx_email_queue_priority ON email_queue(priority DESC);
CREATE INDEX IF NOT EXISTS idx_email_queue_next_retry ON email_queue(next_retry_at) WHERE status IN ('pending', 'retry');
CREATE INDEX IF NOT EXISTS idx_email_queue_created_at ON email_queue(created_at);
CREATE INDEX IF NOT EXISTS idx_email_queue_to_email ON email_queue(to_email);

CREATE INDEX IF NOT EXISTS idx_email_templates_name ON email_templates(name);
CREATE INDEX IF NOT EXISTS idx_email_templates_category ON email_templates(category);
CREATE INDEX IF NOT EXISTS idx_email_templates_active ON email_templates(is_active) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_email_delivery_logs_email_id ON email_delivery_logs(email_id);
CREATE INDEX IF NOT EXISTS idx_email_delivery_logs_event_type ON email_delivery_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_email_delivery_logs_processed_at ON email_delivery_logs(processed_at);

CREATE INDEX IF NOT EXISTS idx_customer_email_preferences_customer_id ON customer_email_preferences(customer_id);

CREATE INDEX IF NOT EXISTS idx_email_campaigns_status ON email_campaigns(status);
CREATE INDEX IF NOT EXISTS idx_email_campaigns_scheduled_at ON email_campaigns(scheduled_at) WHERE status = 'scheduled';
CREATE INDEX IF NOT EXISTS idx_email_campaigns_type ON email_campaigns(campaign_type);

CREATE INDEX IF NOT EXISTS idx_email_campaign_recipients_campaign_id ON email_campaign_recipients(campaign_id);
CREATE INDEX IF NOT EXISTS idx_email_campaign_recipients_customer_id ON email_campaign_recipients(customer_id);
CREATE INDEX IF NOT EXISTS idx_email_campaign_recipients_status ON email_campaign_recipients(status);

CREATE INDEX IF NOT EXISTS idx_email_analytics_email_id ON email_analytics(email_id);
CREATE INDEX IF NOT EXISTS idx_email_analytics_campaign_id ON email_analytics(campaign_id);
CREATE INDEX IF NOT EXISTS idx_email_analytics_customer_id ON email_analytics(customer_id);
CREATE INDEX IF NOT EXISTS idx_email_analytics_event_type ON email_analytics(event_type);
CREATE INDEX IF NOT EXISTS idx_email_analytics_timestamp ON email_analytics(timestamp);

CREATE INDEX IF NOT EXISTS idx_email_unsubscribes_email ON email_unsubscribes(email);
CREATE INDEX IF NOT EXISTS idx_email_unsubscribes_token ON email_unsubscribes(unsubscribe_token);

-- Insert default email queue settings
INSERT INTO email_queue_settings (key, value, description) VALUES
('max_batch_size', '10', 'Maximum number of emails to process in one batch'),
('retry_delay_minutes', '5', 'Minutes to wait before retrying failed emails'),
('max_retry_attempts', '3', 'Maximum number of retry attempts for failed emails'),
('cleanup_days', '30', 'Number of days to keep old email records'),
('rate_limit_per_minute', '60', 'Maximum emails per minute to avoid rate limiting'),
('track_opens', 'true', 'Track email open events'),
('track_clicks', 'true', 'Track email click events'),
('default_from_email', '"noreply@maskom.network"', 'Default from email address'),
('default_from_name', '"Maskom Network"', 'Default from name'),
('bounce_webhook_enabled', 'false', 'Enable bounce webhook processing'),
('complaint_webhook_enabled', 'false', 'Enable complaint webhook processing')
ON CONFLICT (key) DO NOTHING;

-- Insert default email templates
INSERT INTO email_templates (name, description, subject_template, html_template, text_template, category) VALUES
('welcome_email', 'Welcome email for new customer registration', 'Selamat Datang di Maskom Network!', 
'<h1>Selamat Datang di Maskom Network!</h1><p>Halo {{user_name}},</p><p>Terima kasih telah bergabung dengan Maskom Network. Akun Anda telah berhasil dibuat pada {{signup_date}}.</p><p>Anda sekarang dapat menikmati layanan internet berkualitas tinggi kami.</p><p>Jika ada pertanyaan, jangan ragu menghubungi tim support kami.</p><p>Best regards,<br/>Tim Maskom Network</p>',
'Selamat Datang di Maskom Network!\n\nHalo {{user_name}},\n\nTerima kasih telah bergabung dengan Maskom Network. Akun Anda telah berhasil dibuat pada {{signup_date}}.\n\nAnda sekarang dapat menikmati layanan internet berkualitas tinggi kami.\n\nJika ada pertanyaan, jangan ragu menghubungi tim support kami.\n\nBest regards,\nTim Maskom Network',
'transactional'),

('password_reset', 'Password reset email', 'Reset Password Anda', 
'<h1>Reset Password</h1><p>Halo {{user_name}},</p><p>Kami menerima permintaan untuk reset password akun Anda. Klik link di bawah ini untuk reset password:</p><p><a href="{{reset_url}}">Reset Password</a></p><p>Link ini akan kadaluarsa dalam {{expiry_hours}} jam.</p><p>Jika Anda tidak meminta reset password, abaikan email ini.</p><p>Best regards,<br/>Tim Maskom Network</p>',
'Reset Password\n\nHalo {{user_name}},\n\nKami menerima permintaan untuk reset password akun Anda. Kunjungi link berikut untuk reset password:\n{{reset_url}}\n\nLink ini akan kadaluarsa dalam {{expiry_hours}} jam.\n\nJika Anda tidak meminta reset password, abaikan email ini.\n\nBest regards,\nTim Maskom Network',
'transactional'),

('billing_reminder', 'Billing reminder for upcoming payments', 'Pengingat Pembayaran - Invoice {{invoice_number}}', 
'<h2>Pengingat Pembayaran</h2><p>Halo {{user_name}},</p><p>Ini adalah pengingat bahwa invoice Anda akan jatuh tempo segera.</p><div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0;"><h3>Detail Invoice</h3><p><strong>Nomor Invoice:</strong> {{invoice_number}}</p><p><strong>Jumlah:</strong> Rp {{amount}}</p><p><strong>Jatuh Tempo:</strong> {{due_date}}</p><p><strong>Layanan:</strong> {{product_name}}</p></div><p>Silakan lakukan pembayaran sebelum jatuh tempo untuk menghindari interupsi layanan.</p><p><a href="{{billing_url}}">Lihat Invoice</a></p><p>Best regards,<br/>Tim Maskom Network</p>',
'Pengingat Pembayaran\n\nHalo {{user_name}},\n\nIni adalah pengingat bahwa invoice Anda akan jatuh tempo segera.\n\nDetail Invoice:\nNomor Invoice: {{invoice_number}}\nJumlah: Rp {{amount}}\nJatuh Tempo: {{due_date}}\nLayanan: {{product_name}}\n\nSilakan lakukan pembayaran sebelum jatuh tempo untuk menghindari interupsi layanan.\n\nLihat invoice Anda di: {{billing_url}}\n\nBest regards,\nTim Maskom Network',
'transactional'),

('service_notification', 'Service status and notifications', '[{{severity}}] {{subject}}', 
'<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;"><div style="background-color: {{bg_color}}; padding: 20px; border-radius: 5px;"><h2 style="color: {{text_color}}; margin: 0 0 10px 0;">{{subject}}</h2><p style="color: {{text_color}}; margin: 0;">{{message}}</p></div><div style="margin-top: 20px; padding: 20px; background-color: #f8f9fa; border-radius: 5px;"><p style="margin: 0; color: #6c757d; font-size: 14px;">Ini adalah notifikasi otomatis dari Maskom Network. Jika ada pertanyaan, silakan hubungi tim support kami.</p></div></div>',
'[{{severity}}] {{subject}}\n\n{{message}}\n\nIni adalah notifikasi otomatis dari Maskom Network. Jika ada pertanyaan, silakan hubungi tim support kami.',
'notification')
ON CONFLICT (name) DO NOTHING;

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_email_queue_updated_at BEFORE UPDATE ON email_queue FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_email_templates_updated_at BEFORE UPDATE ON email_templates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_customer_email_preferences_updated_at BEFORE UPDATE ON customer_email_preferences FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_email_campaigns_updated_at BEFORE UPDATE ON email_campaigns FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS)
ALTER TABLE email_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_delivery_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_email_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_campaign_recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_unsubscribes ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Email queue policies
CREATE POLICY "Service role can manage email queue" ON email_queue
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Email delivery logs policies
CREATE POLICY "Service role can manage delivery logs" ON email_delivery_logs
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Customer email preferences policies
CREATE POLICY "Users can view own email preferences" ON customer_email_preferences
    FOR SELECT USING (auth.uid() = customer_id);

CREATE POLICY "Users can update own email preferences" ON customer_email_preferences
    FOR UPDATE USING (auth.uid() = customer_id);

CREATE POLICY "Service role can manage email preferences" ON customer_email_preferences
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Email campaigns policies
CREATE POLICY "Service role can manage campaigns" ON email_campaigns
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Campaign recipients policies
CREATE POLICY "Service role can manage campaign recipients" ON email_campaign_recipients
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Email analytics policies
CREATE POLICY "Service role can manage analytics" ON email_analytics
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Unsubscribe policies
CREATE POLICY "Public can unsubscribe" ON email_unsubscribes
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Service role can manage unsubscribes" ON email_unsubscribes
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Database Functions for Email Queue Management

-- Function to add email to queue
CREATE OR REPLACE FUNCTION add_email_to_queue(
    p_to_email TEXT,
    p_from_email TEXT DEFAULT 'noreply@maskom.network',
    p_subject TEXT,
    p_content_html TEXT DEFAULT NULL,
    p_content_text TEXT DEFAULT NULL,
    p_template_id UUID DEFAULT NULL,
    p_template_data JSONB DEFAULT '{}',
    p_priority INTEGER DEFAULT 5,
    p_metadata JSONB DEFAULT '{}'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_email_id UUID;
BEGIN
    INSERT INTO email_queue (
        to_email,
        from_email,
        subject,
        content_html,
        content_text,
        template_id,
        template_data,
        priority,
        metadata
    ) VALUES (
        p_to_email,
        p_from_email,
        p_subject,
        p_content_html,
        p_content_text,
        p_template_id,
        p_template_data,
        p_priority,
        p_metadata
    ) RETURNING id INTO v_email_id;
    
    -- Log the queued event
    INSERT INTO email_delivery_logs (
        email_id,
        event_type,
        metadata
    ) VALUES (
        v_email_id,
        'queued',
        jsonb_build_object('queued_at', NOW())
    );
    
    RETURN v_email_id;
END;
$$;

-- Function to process email queue
CREATE OR REPLACE FUNCTION process_email_queue(
    batch_size INTEGER DEFAULT 10
)
RETURNS TABLE(
    processed INTEGER,
    failed INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_emails_to_process RECORD;
    v_processed_count INTEGER := 0;
    v_failed_count INTEGER := 0;
    v_retry_delay_minutes INTEGER;
BEGIN
    -- Get retry delay from settings
    SELECT (value::text)::integer INTO v_retry_delay_minutes 
    FROM email_queue_settings 
    WHERE key = 'retry_delay_minutes';
    
    IF v_retry_delay_minutes IS NULL THEN
        v_retry_delay_minutes := 5;
    END IF;
    
    -- Get emails to process
    FOR v_emails_to_process IN 
        SELECT id, to_email, from_email, subject, content_html, content_text, template_id, template_data, attempts, max_attempts
        FROM email_queue
        WHERE status IN ('pending', 'retry')
        AND (next_retry_at IS NULL OR next_retry_at <= NOW())
        ORDER BY priority DESC, created_at ASC
        LIMIT batch_size
    LOOP
        BEGIN
            -- Update status to processing
            UPDATE email_queue 
            SET status = 'processing', 
                last_attempt_at = NOW(),
                attempts = attempts + 1
            WHERE id = v_emails_to_process.id;
            
            -- Here you would integrate with actual email service (SendGrid, SES, etc.)
            -- For now, we'll simulate successful sending
            UPDATE email_queue 
            SET status = 'sent',
                sent_at = NOW()
            WHERE id = v_emails_to_process.id;
            
            -- Log successful delivery
            INSERT INTO email_delivery_logs (
                email_id,
                event_type,
                provider,
                provider_message_id,
                metadata
            ) VALUES (
                v_emails_to_process.id,
                'sent',
                'supabase',
                v_emails_to_process.id::text,
                jsonb_build_object('sent_at', NOW())
            );
            
            v_processed_count := v_processed_count + 1;
            
        EXCEPTION WHEN OTHERS THEN
            -- Handle failed email
            IF v_emails_to_process.attempts + 1 >= v_emails_to_process.max_attempts THEN
                -- Max attempts reached, mark as failed
                UPDATE email_queue 
                SET status = 'failed',
                    error_message = SQLERRM
                WHERE id = v_emails_to_process.id;
                
                v_failed_count := v_failed_count + 1;
            ELSE
                -- Schedule for retry
                UPDATE email_queue 
                SET status = 'retry',
                    next_retry_at = NOW() + (v_retry_delay_minutes || ' minutes')::INTERVAL,
                    error_message = SQLERRM
                WHERE id = v_emails_to_process.id;
            END IF;
            
            -- Log failure
            INSERT INTO email_delivery_logs (
                email_id,
                event_type,
                response_message,
                metadata
            ) VALUES (
                v_emails_to_process.id,
                'failed',
                SQLERRM,
                jsonb_build_object('failed_at', NOW(), 'attempt', v_emails_to_process.attempts + 1)
            );
        END;
    END LOOP;
    
    RETURN QUERY SELECT v_processed_count, v_failed_count;
END;
$$;

-- Function to get email queue statistics
CREATE OR REPLACE FUNCTION get_email_queue_stats()
RETURNS TABLE(
    pending_count BIGINT,
    processing_count BIGINT,
    sent_today BIGINT,
    failed_today BIGINT,
    retry_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        (SELECT COUNT(*) FROM email_queue WHERE status = 'pending'),
        (SELECT COUNT(*) FROM email_queue WHERE status = 'processing'),
        (SELECT COUNT(*) FROM email_queue WHERE status = 'sent' AND DATE(sent_at) = CURRENT_DATE),
        (SELECT COUNT(*) FROM email_queue WHERE status = 'failed' AND DATE(updated_at) = CURRENT_DATE),
        (SELECT COUNT(*) FROM email_queue WHERE status = 'retry');
END;
$$;

-- Function to get customer email preferences
CREATE OR REPLACE FUNCTION get_customer_email_preferences(
    p_customer_id UUID
)
RETURNS TABLE(
    email_enabled BOOLEAN,
    transactional_emails BOOLEAN,
    marketing_emails BOOLEAN,
    newsletter_emails BOOLEAN,
    billing_notifications BOOLEAN,
    service_notifications BOOLEAN,
    appointment_reminders BOOLEAN,
    promotional_emails BOOLEAN,
    security_notifications BOOLEAN,
    frequency_preference TEXT,
    preferred_language TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COALESCE(eep.email_enabled, true),
        COALESCE(eep.transactional_emails, true),
        COALESCE(eep.marketing_emails, false),
        COALESCE(eep.newsletter_emails, false),
        COALESCE(eep.billing_notifications, true),
        COALESCE(eep.service_notifications, true),
        COALESCE(eep.appointment_reminders, true),
        COALESCE(eep.promotional_emails, false),
        COALESCE(eep.security_notifications, true),
        COALESCE(eep.frequency_preference, 'normal'),
        COALESCE(eep.preferred_language, 'id')
    FROM customer_email_preferences eep
    WHERE eep.customer_id = p_customer_id
    UNION ALL
    SELECT 
        true, true, false, false, true, true, true, false, true, 'normal', 'id'
    WHERE NOT EXISTS (
        SELECT 1 FROM customer_email_preferences eep 
        WHERE eep.customer_id = p_customer_id
    );
END;
$$;

-- Function to update customer email preferences
CREATE OR REPLACE FUNCTION update_customer_email_preferences(
    p_customer_id UUID,
    p_email_enabled BOOLEAN DEFAULT true,
    p_transactional_emails BOOLEAN DEFAULT true,
    p_marketing_emails BOOLEAN DEFAULT false,
    p_newsletter_emails BOOLEAN DEFAULT false,
    p_billing_notifications BOOLEAN DEFAULT true,
    p_service_notifications BOOLEAN DEFAULT true,
    p_appointment_reminders BOOLEAN DEFAULT true,
    p_promotional_emails BOOLEAN DEFAULT false,
    p_security_notifications BOOLEAN DEFAULT true,
    p_frequency_preference TEXT DEFAULT 'normal',
    p_preferred_language TEXT DEFAULT 'id'
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO customer_email_preferences (
        customer_id,
        email_enabled,
        transactional_emails,
        marketing_emails,
        newsletter_emails,
        billing_notifications,
        service_notifications,
        appointment_reminders,
        promotional_emails,
        security_notifications,
        frequency_preference,
        preferred_language
    ) VALUES (
        p_customer_id,
        p_email_enabled,
        p_transactional_emails,
        p_marketing_emails,
        p_newsletter_emails,
        p_billing_notifications,
        p_service_notifications,
        p_appointment_reminders,
        p_promotional_emails,
        p_security_notifications,
        p_frequency_preference,
        p_preferred_language
    )
    ON CONFLICT (customer_id) DO UPDATE SET
        email_enabled = EXCLUDED.email_enabled,
        transactional_emails = EXCLUDED.transactional_emails,
        marketing_emails = EXCLUDED.marketing_emails,
        newsletter_emails = EXCLUDED.newsletter_emails,
        billing_notifications = EXCLUDED.billing_notifications,
        service_notifications = EXCLUDED.service_notifications,
        appointment_reminders = EXCLUDED.appointment_reminders,
        promotional_emails = EXCLUDED.promotional_emails,
        security_notifications = EXCLUDED.security_notifications,
        frequency_preference = EXCLUDED.frequency_preference,
        preferred_language = EXCLUDED.preferred_language,
        updated_at = NOW();
    
    RETURN true;
END;
$$;

-- Function to create email campaign
CREATE OR REPLACE FUNCTION create_email_campaign(
    p_name TEXT,
    p_description TEXT DEFAULT NULL,
    p_subject TEXT,
    p_content_html TEXT,
    p_content_text TEXT DEFAULT NULL,
    p_campaign_type TEXT DEFAULT 'marketing',
    p_target_audience JSONB DEFAULT '{}',
    p_scheduled_at TIMESTAMPTZ DEFAULT NULL,
    p_created_by UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_campaign_id UUID;
BEGIN
    INSERT INTO email_campaigns (
        name,
        description,
        subject,
        content_html,
        content_text,
        campaign_type,
        target_audience,
        scheduled_at,
        created_by
    ) VALUES (
        p_name,
        p_description,
        p_subject,
        p_content_html,
        p_content_text,
        p_campaign_type,
        p_target_audience,
        p_scheduled_at,
        p_created_by
    ) RETURNING id INTO v_campaign_id;
    
    RETURN v_campaign_id;
END;
$$;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO service_role;

-- Grant limited permissions to authenticated users
GRANT SELECT ON email_templates TO authenticated;
GRANT SELECT, UPDATE ON customer_email_preferences TO authenticated;
GRANT EXECUTE ON FUNCTION get_customer_email_preferences(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION update_customer_email_preferences(UUID, BOOLEAN, BOOLEAN, BOOLEAN, BOOLEAN, BOOLEAN, BOOLEAN, BOOLEAN, BOOLEAN, BOOLEAN, TEXT, TEXT) TO authenticated;